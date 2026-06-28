import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { PatientRepository } from '../repositories/patient.repository';
import { Patient } from '../schemas/patient.schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { HospitalsCommonService } from '../common/services/hospitals.service';

const requiredCreateFields: (keyof CreatePatientDto)[] = [
  'name',
  'age',
  'gender',
  'bloodGroup',
  'phone',
  'email',
  'address',
  'hospitalId',
  'condition',
  'bedRequired',
];

const allowedGenders = ['male', 'female', 'other'];
const allowedBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

@Injectable()
export class PatientsService {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly hospitalsCommonService: HospitalsCommonService,
  ) {}

  async findAll() {
    return this.patientRepository.findAll({ isActive: true });
  }

  async findOne(id: string) {
    const patient = await this.patientRepository.findById(id);
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    return patient;
  }

  async findByHospital(hospitalId: string) {
    return this.patientRepository.findByHospital(hospitalId);
  }

  async create(data: CreatePatientDto) {
    const patient = this.prepareCreate(data);
    await this.ensureUniqueContact(patient);

    const createdPatient = await this.patientRepository.create(this.toPatientPersistence(patient));

    if (patient.bedRequired && patient.hospitalId) {
      try {
        await this.hospitalsCommonService.allocateBed(patient.hospitalId, createdPatient._id.toString());
      } catch (err) {
        // Rollback patient registration if bed allocation fails
        await this.patientRepository.delete(createdPatient._id.toString());
        throw err;
      }
    }

    return createdPatient;
  }

  async update(id: string, data: UpdatePatientDto) {
    const existing = await this.patientRepository.findById(id);
    if (!existing) throw new NotFoundException(`Patient ${id} not found`);

    const patient = this.prepareUpdate(data);
    await this.ensureUniqueContact(patient, id);
    const updated = await this.patientRepository.update(id, this.toPatientPersistence(patient));
    if (!updated) throw new NotFoundException(`Patient ${id} not found`);
    return updated;
  }

  async remove(id: string) {
    const patient = await this.patientRepository.findById(id);
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);

    if (patient.bedRequired && patient.hospitalId) {
      const hospitalId = patient.populated('hospitalId') || patient.hospitalId;
      await this.hospitalsCommonService.deallocateBed(hospitalId.toString(), patient._id.toString());
    }

    await this.patientRepository.delete(id);
    return { id, removed: true };
  }

  private prepareCreate(data: CreatePatientDto): CreatePatientDto {
    // DTO classes are typed at compile time; runtime payloads still need explicit checks.
    requiredCreateFields.forEach(field => {
      const value = data[field];
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        throw new BadRequestException(`${String(field)} is required`);
      }
    });

    const normalized = this.normalizePatientData(data) as CreatePatientDto;
    this.validateEnumsAndAge(normalized);
    return normalized;
  }

  private prepareUpdate(data: UpdatePatientDto): UpdatePatientDto {
    Object.entries(data).forEach(([field, value]) => {
      if (value === undefined) return;
      if (value === null || (typeof value === 'string' && value.trim() === '')) {
        throw new BadRequestException(`${field} cannot be empty`);
      }
    });

    const normalized = this.normalizePatientData(data) as UpdatePatientDto;
    this.validateEnumsAndAge(normalized);
    return normalized;
  }

  private normalizePatientData(data: CreatePatientDto | UpdatePatientDto): CreatePatientDto | UpdatePatientDto {
    return {
      ...data,
      name: data.name?.trim(),
      phone: data.phone?.trim(),
      email: data.email?.trim().toLowerCase(),
      address: data.address?.trim(),
      hospitalId: data.hospitalId?.trim(),
      condition: data.condition?.trim(),
      age: data.age === undefined ? undefined : Number(data.age),
      bedRequired: data.bedRequired === undefined ? undefined : ((data.bedRequired as any) === true || (data.bedRequired as any) === 'true'),
    };
  }

  private validateEnumsAndAge(data: CreatePatientDto | UpdatePatientDto) {
    if (data.age !== undefined && (!Number.isFinite(data.age) || data.age <= 0)) {
      throw new BadRequestException('age must be greater than 0');
    }
    if (data.gender !== undefined && !allowedGenders.includes(data.gender)) {
      throw new BadRequestException('gender is invalid');
    }
    if (data.bloodGroup !== undefined && !allowedBloodGroups.includes(data.bloodGroup)) {
      throw new BadRequestException('bloodGroup is invalid');
    }
    if (data.hospitalId !== undefined && !Types.ObjectId.isValid(data.hospitalId)) {
      throw new BadRequestException('hospitalId is invalid');
    }
  }

  private async ensureUniqueContact(data: CreatePatientDto | UpdatePatientDto, excludeId?: string) {
    // Check phone first so the frontend can show the most specific duplicate message.
    if (data.phone) {
      const existingPhone = await this.patientRepository.findByPhone(data.phone, excludeId);
      if (existingPhone) throw new ConflictException('Patient with same number already exists');
    }

    if (data.email) {
      const existingEmail = await this.patientRepository.findByEmail(data.email, excludeId);
      if (existingEmail) throw new ConflictException('Patient with same email already exists');
    }
  }

  private toPatientPersistence(data: CreatePatientDto | UpdatePatientDto): Partial<Patient> {
    const { hospitalId, admittedAt, ...rest } = data;
    const patient: Partial<Patient> = { ...rest };

    // The API accepts strings, while Mongoose stores hospitalId as an ObjectId and dates as Date.
    if (hospitalId) patient.hospitalId = new Types.ObjectId(hospitalId);
    if (admittedAt) patient.admittedAt = admittedAt instanceof Date ? admittedAt : new Date(admittedAt);

    return patient;
  }
}
