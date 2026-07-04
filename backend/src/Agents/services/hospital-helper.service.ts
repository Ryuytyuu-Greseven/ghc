import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { appInstance } from '../../main';
import { Patient, PatientDocument } from '../../schemas/patient.schema';
import { Staff, StaffDocument } from '../../schemas/staff.schema';

export class HospitalHelperService {
  static async findPatientsByHospital(
    hospitalId: string,
  ): Promise<PatientDocument[]> {
    if (!appInstance) {
      throw new Error('NestJS application context is not initialized');
    }
    const patientModel = appInstance.get(getModelToken(Patient.name));
    const queryId = Types.ObjectId.isValid(hospitalId)
      ? new Types.ObjectId(hospitalId)
      : hospitalId;
    return patientModel
      .find({
        $or: [{ hospitalId: queryId }, { hospitalId: hospitalId }],
      })
      .populate('hospitalId')
      .exec();
  }

  static async findStaffByHospital(
    hospitalId: string,
  ): Promise<StaffDocument[]> {
    if (!appInstance) {
      throw new Error('NestJS application context is not initialized');
    }
    const staffModel = appInstance.get(getModelToken(Staff.name));
    const queryId = Types.ObjectId.isValid(hospitalId)
      ? new Types.ObjectId(hospitalId)
      : hospitalId;
    return staffModel
      .find({
        $or: [{ hospitalId: queryId }, { hospitalId: hospitalId }],
      })
      .populate('hospitalId')
      .populate('userId')
      .exec();
  }
}
