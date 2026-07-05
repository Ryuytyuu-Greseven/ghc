import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { PatientData, PatientDataDocument } from '../schemas/patient-data.schema';
import { Hospital, HospitalDocument } from '../schemas/hospital.schema';
import { Staff, StaffDocument } from '../schemas/staff.schema';
import { Patient, PatientDocument } from '../schemas/patient.schema';
import { BranchInventory, BranchInventoryDocument } from '../schemas/branch-inventory.schema';

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

    return {
      totalVisits,
      topDiagnoses,
      topMedicines,
      topMedicinesByBranch,
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
