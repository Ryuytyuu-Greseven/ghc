import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { PatientData, PatientDataDocument } from '../schemas/patient-data.schema';
import { Hospital, HospitalDocument } from '../schemas/hospital.schema';
import { Staff, StaffDocument } from '../schemas/staff.schema';
import { Patient, PatientDocument } from '../schemas/patient.schema';
import { BranchInventory, BranchInventoryDocument } from '../schemas/branch-inventory.schema';
import { llmInstance } from '../google/vertex.config';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(PatientData.name) private readonly patientDataModel: Model<PatientDataDocument>,
    @InjectModel(Hospital.name) private readonly hospitalModel: Model<HospitalDocument>,
    @InjectModel(Staff.name) private readonly staffModel: Model<StaffDocument>,
    @InjectModel(Patient.name) private readonly patientModel: Model<PatientDocument>,
    @InjectModel(BranchInventory.name) private readonly branchInventoryModel: Model<BranchInventoryDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private async resolveBranchScope(user: any, requestedBranchId?: string): Promise<string | undefined> {
    if (user.role === 'Admin') {
      return requestedBranchId;
    }
    const staff = await this.staffModel
      .findOne({ userId: new Types.ObjectId(user.userId) })
      .exec();
    if (!staff || !staff.hospitalId) {
      throw new ForbiddenException('Access denied. No assigned facility found for this user.');
    }
    return staff.hospitalId.toString();
  }

  private async getHospitalVersionIds(branchId?: string): Promise<Types.ObjectId[] | null> {
    if (!branchId) return null;
    const selectedHospital = await this.hospitalModel.findById(branchId).exec();
    if (selectedHospital) {
      const rootId = selectedHospital.hospitalId || selectedHospital._id.toString();
      const allVersions = await this.hospitalModel
        .find({
          $or: [
            { _id: new Types.ObjectId(rootId) },
            { hospitalId: rootId }
          ]
        })
        .select('_id')
        .exec();
      return allVersions.map((h) => h._id as Types.ObjectId);
    }
    return [new Types.ObjectId(branchId)];
  }

  async getClinicalReport(user: any, branchId?: string, fromDate?: string, toDate?: string) {
    const resolvedBranchId = await this.resolveBranchScope(user, branchId);
    const match: any = {};

    if (resolvedBranchId) {
      const hospitalIds = await this.getHospitalVersionIds(resolvedBranchId);
      if (hospitalIds) {
        const patients = await this.patientModel
          .find({ hospitalId: { $in: hospitalIds } })
          .select('_id')
          .exec();
        const patientIds = patients.map((p) => p._id);
        match.patientId = { $in: patientIds };
      }
    }

    if (fromDate || toDate) {
      match.visitDate = {};
      if (fromDate) match.visitDate.$gte = new Date(fromDate);
      if (toDate) match.visitDate.$lte = new Date(toDate);
    }

    const totalVisits = await this.patientDataModel.countDocuments(match);

    const topDiagnoses = await this.patientDataModel.aggregate([
      { $match: match },
      { $group: { _id: '$problem', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { name: '$_id', count: 1, _id: 0 } },
    ]);

    const topMedicines = await this.patientDataModel.aggregate([
      { $match: match },
      { $unwind: '$medicines' },
      { $group: { _id: '$medicines.name', count: { $sum: '$medicines.quantity' } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { name: '$_id', count: 1, _id: 0 } },
    ]);

    // Top medicines grouped by branch — join patient → hospital name
    const topMedicinesByBranch = await this.patientDataModel.aggregate([
      { $match: match },
      { $unwind: '$medicines' },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient',
        },
      },
      { $unwind: { path: '$patient', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'hospitals',
          localField: 'patient.hospitalId',
          foreignField: '_id',
          as: 'hospital',
        },
      },
      { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            medicine: '$medicines.name',
            branch: { $ifNull: ['$hospital.name', 'Unknown Branch'] },
          },
          count: { $sum: '$medicines.quantity' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          medicineName: '$_id.medicine',
          branchName: '$_id.branch',
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Daily walk-in time-series trend
    const trendMatch = { ...match };
    if (!trendMatch.visitDate) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      trendMatch.visitDate = { $gte: thirtyDaysAgo };
    }

    const dailyVisitsRaw = await this.patientDataModel.aggregate([
      { $match: trendMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const footfallTrend: { date: string; quantity: number }[] = [];
    let startDate = new Date();
    if (fromDate) {
      startDate = new Date(fromDate);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }
    let endDate = new Date();
    if (toDate) {
      endDate = new Date(toDate);
    }

    const rawMap = new Map<string, number>();
    dailyVisitsRaw.forEach((item) => {
      if (item._id) rawMap.set(item._id, item.count);
    });

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      footfallTrend.push({
        date: dateStr,
        quantity: rawMap.get(dateStr) || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    const totalTrendVisits = footfallTrend.reduce((sum, item) => sum + item.quantity, 0);
    const averageDailyVisits = footfallTrend.length > 0 ? totalTrendVisits / footfallTrend.length : 0;

    let branchName = 'GHC Facility';
    if (branchId) {
      const selectedHospital = await this.hospitalModel.findById(branchId).exec();
      if (selectedHospital) {
        branchName = selectedHospital.name;
      }
    }

    // Default/statistical fallback forecast
    const footfallForecast: { date: string; quantity: number }[] = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(tomorrow);
      nextDate.setDate(nextDate.getDate() + i);
      footfallForecast.push({
        date: nextDate.toISOString().split('T')[0],
        quantity: Math.round(averageDailyVisits),
      });
    }
    let footfallSummary = `Based on historical patterns, daily visits are expected to average around ${Math.round(averageDailyVisits)} patients.`;

    try {
      const prompt = `Analyze this patient walk-in/footfall trend for a healthcare facility and predict daily visits for the next 7 days.
      
Facility/Branch: ${branchName}
Average daily visits (past period): ${Math.round(averageDailyVisits * 100) / 100}
Historical daily visits (past period): ${JSON.stringify(footfallTrend)}

Return ONLY a valid JSON object with this exact shape:
{
  "summary": "a one or two sentence operational analysis explaining the forecast, busy days, and staffing recommendations",
  "forecast7Day": [
    {"date": "YYYY-MM-DD", "quantity": number},
    {"date": "YYYY-MM-DD", "quantity": number},
    {"date": "YYYY-MM-DD", "quantity": number},
    {"date": "YYYY-MM-DD", "quantity": number},
    {"date": "YYYY-MM-DD", "quantity": number},
    {"date": "YYYY-MM-DD", "quantity": number},
    {"date": "YYYY-MM-DD", "quantity": number}
  ]
}`;

      const response = await llmInstance.invoke([
        new SystemMessage(
          'You are a healthcare analytics forecasting assistant. Respond with JSON only.',
        ),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
        
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.summary) {
          footfallSummary = parsed.summary;
        }
        if (Array.isArray(parsed.forecast7Day) && parsed.forecast7Day.length === 7) {
          footfallForecast.length = 0;
          parsed.forecast7Day.forEach((item: any) => {
            footfallForecast.push({
              date: item.date,
              quantity: Math.max(0, Math.round(Number(item.quantity) || 0)),
            });
          });
        }
      }
    } catch (err) {
      console.error('Error generating AI footfall forecast:', err);
    }

    return {
      totalVisits,
      topDiagnoses,
      topMedicines,
      topMedicinesByBranch,
      footfallTrend,
      footfallForecast,
      footfallSummary,
    };
  }

  async getOccupancyReport(user: any, branchId?: string, page?: number, pageSize?: number) {
    const resolvedBranchId = await this.resolveBranchScope(user, branchId);
    const filter: any = { isCurrent: { $ne: false } };
    if (resolvedBranchId) {
      filter._id = new Types.ObjectId(resolvedBranchId);
    }

    const hospitals = await this.hospitalModel.find(filter).exec();

    let totalBeds = 0;
    let availableBeds = 0;
    const allDetails = hospitals.map((h) => {
      const tBeds = h.totalBeds || 0;
      const aBeds = h.availableBeds || 0;
      totalBeds += tBeds;
      availableBeds += aBeds;
      const occupied = tBeds - aBeds;
      const occupancyRate = tBeds > 0 ? Math.round((occupied / tBeds) * 100) : 0;
      return {
        hospitalId: h._id,
        name: h.name,
        type: h.type,
        totalBeds: tBeds,
        availableBeds: aBeds,
        occupiedBeds: occupied,
        occupancyRate,
      };
    });

    const occupiedBeds = totalBeds - availableBeds;
    const averageOccupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Apply pagination slicing
    let paginatedDetails = allDetails;
    let pagination: any = null;

    if (page && pageSize) {
      const total = allDetails.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      paginatedDetails = allDetails.slice(startIndex, startIndex + pageSize);
      pagination = {
        page,
        pageSize,
        total,
        totalPages,
      };
    }

    return {
      totalBeds,
      availableBeds,
      occupiedBeds,
      averageOccupancyRate,
      details: paginatedDetails,
      pagination,
    };
  }

  async getStaffingReport(user: any, branchId?: string) {
    const resolvedBranchId = await this.resolveBranchScope(user, branchId);
    const match: any = {};
    if (resolvedBranchId) {
      const hospitalIds = await this.getHospitalVersionIds(resolvedBranchId);
      if (hospitalIds) {
        match.hospitalId = { $in: hospitalIds };
      }
    }

    const totalStaff = await this.staffModel.countDocuments(match);

    const departmentsDistribution = await this.staffModel.aggregate([
      { $match: match },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $project: { department: '$_id', count: 1, _id: 0 } },
    ]);

    const rolesDistribution = await this.staffModel.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$user.role', 'Staff'] },
          count: { $sum: 1 },
        },
      },
      { $project: { role: '$_id', count: 1, _id: 0 } },
    ]);

    // Use raw native driver to avoid Mongoose casting hospitalId string→ObjectId
    // which breaks the $toObjectId coercion inside $lookup $let.
    const rawMatch: any = {};
    if (match.hospitalId) {
      // match.hospitalId was built as { $in: ObjectId[] }, convert to string array for raw query
      rawMatch.hospitalId = { $in: match.hospitalId.$in.map((id: Types.ObjectId) => id.toString()) };
    }

    const branchDistribution = await this.connection.db!
      .collection('staffs')
      .aggregate([
        { $match: { ...rawMatch, hospitalId: { $exists: true, $ne: null } } },
        {
          $lookup: {
            from: 'hospitals',
            let: { hId: { $toObjectId: '$hospitalId' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$hId'] } } },
              { $project: { name: 1 } },
            ],
            as: 'hospital',
          },
        },
        { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$hospitalId',
            branchName: { $first: { $ifNull: ['$hospital.name', 'Unknown Branch'] } },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            branchId: '$_id',
            branchName: 1,
            count: 1,
            _id: 0,
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    return {
      totalStaff,
      departmentsDistribution,
      rolesDistribution,
      branchDistribution,
    };
  }

  async getInventoryReport(user: any, branchId?: string) {
    const resolvedBranchId = await this.resolveBranchScope(user, branchId);
    const match: any = {};
    if (resolvedBranchId) {
      const hospitalIds = await this.getHospitalVersionIds(resolvedBranchId);
      if (hospitalIds) {
        match.branchId = { $in: hospitalIds };
      }
    }

    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + 90);

    const expiringSoon = await this.branchInventoryModel.aggregate([
      {
        $match: {
          ...match,
          expiryDate: { $gte: now, $lte: thresholdDate },
        },
      },
      {
        $lookup: {
          from: 'inventorymasters',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
      {
        $lookup: {
          from: 'hospitals',
          localField: 'branchId',
          foreignField: '_id',
          as: 'branch',
        },
      },
      { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          batchNo: 1,
          availableQty: 1,
          expiryDate: 1,
          itemName: '$item.itemName',
          category: '$item.category',
          branchName: { $ifNull: ['$branch.name', 'Central Store'] },
        },
      },
      { $sort: { expiryDate: 1 } },
      { $limit: 10 },
    ]);

    const categoryBreakdown = await this.branchInventoryModel.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'inventorymasters',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
      {
        $group: {
          _id: '$item.category',
          totalQty: { $sum: '$availableQty' },
          itemCount: { $sum: 1 },
        },
      },
      {
        $project: {
          category: '$_id',
          totalQty: 1,
          itemCount: 1,
          _id: 0,
        },
      },
    ]);

    const medicineAvailability = await this.branchInventoryModel.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'inventorymasters',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: '$item' },
      {
        $group: {
          _id: '$itemId',
          name: { $first: '$item.itemName' },
          category: { $first: '$item.category' },
          totalQty: { $sum: '$availableQty' },
          branchesCount: { $addToSet: '$branchId' },
          batchesCount: { $sum: 1 },
        },
      },
      {
        $project: {
          itemId: '$_id',
          name: 1,
          category: 1,
          totalQty: 1,
          branchesCount: { $size: '$branchesCount' },
          batchesCount: 1,
          _id: 0,
        },
      },
      { $sort: { name: 1 } },
    ]);

    return {
      expiringSoon,
      categoryBreakdown,
      medicineAvailability,
    };
  }
}
