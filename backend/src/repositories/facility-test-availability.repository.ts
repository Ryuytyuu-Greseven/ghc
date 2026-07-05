import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import {
  FacilityTestAvailability,
  FacilityTestAvailabilityDocument,
} from '../schemas/facility-test-availability.schema';
import { Hospital, HospitalDocument } from '../schemas/hospital.schema';
import { TestAvailabilityStatus } from '../common/enums/diagnostic-test.enum';

@Injectable()
export class FacilityTestAvailabilityRepository {
  constructor(
    @InjectModel(FacilityTestAvailability.name)
    private readonly model: Model<FacilityTestAvailabilityDocument>,
    @InjectModel(Hospital.name)
    private readonly hospitalModel: Model<HospitalDocument>,
  ) {}

  async findByHospital(
    hospitalId: string,
  ): Promise<FacilityTestAvailabilityDocument[]> {
    return this.model
      .find({ hospitalId: new Types.ObjectId(hospitalId) })
      .populate('testId', 'testName testCode category sampleType status')
      .exec();
  }

  async findAvailableByHospital(
    hospitalId: string,
  ): Promise<FacilityTestAvailabilityDocument[]> {
    const hospitalObjectIds = await this.resolveHospitalObjectIds(hospitalId);
    if (!hospitalObjectIds.length) {
      return [];
    }

    return this.model
      .find({
        hospitalId: { $in: hospitalObjectIds },
        status: TestAvailabilityStatus.Available,
      })
      .populate('testId', 'testName testCode category sampleType status')
      .exec();
  }

  async resolveHospitalIdStrings(hospitalId: string): Promise<string[]> {
    const objectIds = await this.resolveHospitalObjectIds(hospitalId);
    return objectIds.map((id) => id.toString());
  }

  private async resolveHospitalObjectIds(
    hospitalId: string,
  ): Promise<Types.ObjectId[]> {
    if (!Types.ObjectId.isValid(hospitalId)) {
      return [];
    }

    const hospitals = await this.hospitalModel
      .find({
        $or: [{ _id: new Types.ObjectId(hospitalId) }, { hospitalId }],
      })
      .select('_id hospitalId')
      .lean()
      .exec();

    const idSet = new Set<string>([hospitalId]);
    for (const hospital of hospitals) {
      idSet.add(hospital._id.toString());
      if (hospital.hospitalId) {
        idSet.add(hospital.hospitalId);
      }
    }

    return [...idSet]
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
  }

  async findByTestId(
    testId: string,
  ): Promise<FacilityTestAvailabilityDocument[]> {
    return this.model
      .find({ testId: new Types.ObjectId(testId) })
      .exec();
  }

  async findByHospitalAndTest(
    hospitalId: string,
    testId: string,
  ): Promise<FacilityTestAvailabilityDocument | null> {
    return this.model
      .findOne({
        hospitalId: new Types.ObjectId(hospitalId),
        testId: new Types.ObjectId(testId),
      })
      .exec();
  }

  async upsertByHospitalAndTest(
    hospitalId: string,
    testId: string,
    data: Partial<FacilityTestAvailability>,
  ): Promise<FacilityTestAvailabilityDocument> {
    const record = await this.model
      .findOneAndUpdate(
        {
          hospitalId: new Types.ObjectId(hospitalId),
          testId: new Types.ObjectId(testId),
        },
        data,
        { new: true, upsert: true },
      )
      .exec();
    return record!;
  }

  async countByStatusForHospital(
    hospitalId: string,
  ): Promise<{ total: number; unavailable: number }> {
    const hospitalObjectId = new Types.ObjectId(hospitalId);
    const [total, unavailable] = await Promise.all([
      this.model.countDocuments({ hospitalId: hospitalObjectId }).exec(),
      this.model
        .countDocuments({
          hospitalId: hospitalObjectId,
          status: {
            $in: [
              TestAvailabilityStatus.Unavailable,
              TestAvailabilityStatus.OutOfOrder,
            ],
          },
        })
        .exec(),
    ]);
    return { total, unavailable };
  }

  async findUnavailableByHospital(
    hospitalId: string,
  ): Promise<FacilityTestAvailabilityDocument[]> {
    return this.model
      .find({
        hospitalId: new Types.ObjectId(hospitalId),
        status: {
          $in: [
            TestAvailabilityStatus.Unavailable,
            TestAvailabilityStatus.OutOfOrder,
            TestAvailabilityStatus.Partial,
          ],
        },
      })
      .populate('testId', 'testName testCode category')
      .exec();
  }

  async update(
    id: string,
    data: UpdateQuery<FacilityTestAvailabilityDocument>,
  ): Promise<FacilityTestAvailabilityDocument | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }
}
