import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { Patient, PatientDocument } from '../schemas/patient.schema';

@Injectable()
export class PatientRepository {
  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<PatientDocument[]> {
    return this.patientModel.find(filter).populate('hospitalId').exec();
  }

  async findById(id: string): Promise<PatientDocument | null> {
    return this.patientModel.findById(id).populate('hospitalId').exec();
  }

  async findOne(filter: object): Promise<PatientDocument | null> {
    return this.patientModel.findOne(filter).populate('hospitalId').exec();
  }

  async findByHospital(hospitalId: string): Promise<PatientDocument[]> {
    return this.patientModel.find({ hospitalId }).populate('hospitalId').exec();
  }

  async findByEmail(email: string, excludeId?: string): Promise<PatientDocument | null> {
    const filter: Record<string, unknown> = { email };
    if (excludeId) filter._id = { $ne: excludeId };
    return this.patientModel.findOne(filter).exec();
  }

  async findByPhone(phone: string, excludeId?: string): Promise<PatientDocument | null> {
    const filter: Record<string, unknown> = { phone };
    if (excludeId) filter._id = { $ne: excludeId };
    return this.patientModel.findOne(filter).exec();
  }

  async create(data: Partial<Patient>): Promise<PatientDocument> {
    return this.patientModel.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<PatientDocument>,
  ): Promise<PatientDocument | null> {
    return this.patientModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<PatientDocument | null> {
    return this.patientModel.findByIdAndDelete(id).exec();
  }

  async count(filter: object = {}): Promise<number> {
    return this.patientModel.countDocuments(filter).exec();
  }
}
