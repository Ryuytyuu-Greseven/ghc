import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { PatientData, PatientDataDocument } from '../schemas/patient-data.schema';

@Injectable()
export class PatientDataRepository {
  constructor(
    @InjectModel(PatientData.name)
    private readonly patientDataModel: Model<PatientDataDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<PatientDataDocument[]> {
    return this.patientDataModel.find(filter).sort({ visitDate: -1 }).exec();
  }

  async findById(id: string): Promise<PatientDataDocument | null> {
    return this.patientDataModel.findById(id).exec();
  }

  async findByPatient(patientId: string): Promise<PatientDataDocument[]> {
    return this.patientDataModel
      .find({ patientId: new Types.ObjectId(patientId), isActive: { $ne: false } })
      .sort({ visitDate: -1 })
      .exec();
  }

  async create(data: Partial<PatientData>): Promise<PatientDataDocument> {
    return this.patientDataModel.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<PatientDataDocument>,
  ): Promise<PatientDataDocument | null> {
    return this.patientDataModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<PatientDataDocument | null> {
    return this.patientDataModel.findByIdAndDelete(id).exec();
  }
}
