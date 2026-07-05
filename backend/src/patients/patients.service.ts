import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { PatientRepository } from '../repositories/patient.repository';
import { Patient } from '../schemas/patient.schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { HospitalsCommonService } from '../common/services/hospitals.service';
import { HospitalRepository } from '../repositories/hospital.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types';
import { llmInstance } from '../google/vertex.config';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

const requiredCreateFields: (keyof CreatePatientDto)[] = [
  'name',
  'age',
  'gender',
  'bloodGroup',
  'phone',
  'email',
  'aadhaarNumber',
  'address',
  'hospitalId',
  'bedRequired',
];

const allowedGenders = ['male', 'female', 'other'];
const allowedBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

@Injectable()
export class PatientsService {
  constructor(
    private readonly patientRepository: PatientRepository,
    private readonly hospitalsCommonService: HospitalsCommonService,
    private readonly hospitalRepository: HospitalRepository,
    private readonly notificationsService: NotificationsService,
  ) { }

  async findAll(query: SearchPatientsDto = {}) {
    return this.patientRepository.findPaginated({
      ...query,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 10,
    });
  }

  async findAllList(filter: object = {}) {
    return this.patientRepository.findAll({ isActive: true, ...filter });
  }

  async findOne(id: string) {
    const patient = await this.patientRepository.findById(id);
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    return patient;
  }

  async findByHospital(hospitalId: string) {
    return this.patientRepository.findByHospital(hospitalId);
  }

  async findDischarged(options: { hospitalId?: string; from: Date; to: Date }) {
    const filter: Record<string, unknown> = {
      isActive: false,
      dischargedAt: { $gte: options.from, $lte: options.to },
    };
    if (options.hospitalId) {
      filter.hospitalId = new Types.ObjectId(options.hospitalId);
    }
    return this.patientRepository.findDischarged(filter);
  }

  async create(data: CreatePatientDto) {
    const patient = this.prepareCreate(data);
    await this.ensureUniqueAadhaar(patient);
    const createdPatient = await this.patientRepository.create(
      this.toPatientPersistence(patient),
    );
    if (patient.bedRequired && patient.hospitalId) {
      try {
        await this.hospitalsCommonService.allocateBed(
          patient.hospitalId,
          createdPatient._id.toString(),
        );
      } catch (err) {
        // Rollback patient registration if bed allocation fails
        await this.patientRepository.delete(createdPatient._id.toString());
        throw err;
      }
    }

    const hospital = patient.hospitalId
      ? await this.hospitalRepository.findById(patient.hospitalId)
      : null;
    void this.notificationsService.dispatch(
      NotificationType.PATIENT_ONBOARDED,
      {
        patient: createdPatient,
        hospitalName: hospital?.name,
      },
    );

    return createdPatient;
  }

  async update(id: string, data: UpdatePatientDto) {
    const existing = await this.patientRepository.findById(id);
    if (!existing) throw new NotFoundException(`Patient ${id} not found`);

    const patient = this.prepareUpdate(data);
    await this.ensureUniqueAadhaar(patient, id);
    const updated = await this.patientRepository.update(
      id,
      this.toPatientPersistence(patient),
    );
    if (!updated) throw new NotFoundException(`Patient ${id} not found`);
    return updated;
  }

  private prepareCreate(data: CreatePatientDto): CreatePatientDto {
    // DTO classes are typed at compile time; runtime payloads still need explicit checks.
    requiredCreateFields.forEach((field) => {
      const value = data[field];
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '')
      ) {
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
      if (
        value === null ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        throw new BadRequestException(`${field} cannot be empty`);
      }
    });

    const normalized = this.normalizePatientData(data);
    this.validateEnumsAndAge(normalized);
    return normalized;
  }

  private normalizePatientData(
    data: CreatePatientDto | UpdatePatientDto,
  ): CreatePatientDto | UpdatePatientDto {
    return {
      ...data,
      name: data.name?.trim(),
      phone: data.phone?.trim(),
      email: data.email?.trim().toLowerCase(),
      aadhaarNumber: data.aadhaarNumber?.trim(),
      address: data.address?.trim(),
      hospitalId: data.hospitalId?.trim(),
      age: data.age === undefined ? undefined : Number(data.age),
      bedRequired:
        data.bedRequired === undefined
          ? undefined
          : (data.bedRequired as any) === true ||
          (data.bedRequired as any) === 'true',
    };
  }

  private validateEnumsAndAge(data: CreatePatientDto | UpdatePatientDto) {
    if (
      data.age !== undefined &&
      (!Number.isFinite(data.age) || data.age <= 0)
    ) {
      throw new BadRequestException('age must be greater than 0');
    }
    if (data.gender !== undefined && !allowedGenders.includes(data.gender)) {
      throw new BadRequestException('gender is invalid');
    }
    if (
      data.bloodGroup !== undefined &&
      !allowedBloodGroups.includes(data.bloodGroup)
    ) {
      throw new BadRequestException('bloodGroup is invalid');
    }
    if (
      data.hospitalId !== undefined &&
      !Types.ObjectId.isValid(data.hospitalId)
    ) {
      throw new BadRequestException('hospitalId is invalid');
    }
    if (
      data.aadhaarNumber !== undefined &&
      !/^\d{12}$/.test(data.aadhaarNumber)
    ) {
      throw new BadRequestException('aadhaarNumber must be 12 digits');
    }
  }

  private async ensureUniqueAadhaar(
    data: CreatePatientDto | UpdatePatientDto,
    excludeId?: string,
  ) {
    // Aadhaar is the patient identity comparison key; phone/email can be shared or updated.
    if (!data.aadhaarNumber) return;

    const existingPatient = await this.patientRepository.findByAadhaarNumber(
      data.aadhaarNumber,
      excludeId,
    );
    if (existingPatient)
      throw new ConflictException(
        'Patient with same Aadhaar number already exists',
      );
  }

  private toPatientPersistence(data: CreatePatientDto | UpdatePatientDto): Partial<Patient> {
    const { hospitalId, admittedAt, dischargedAt, ...rest } = data;
    const patient: Partial<Patient> = { ...rest };

    // The API accepts strings, while Mongoose stores hospitalId as an ObjectId and dates as Date.
    if (hospitalId) patient.hospitalId = new Types.ObjectId(hospitalId);
    if (admittedAt) patient.admittedAt = admittedAt instanceof Date ? admittedAt : new Date(admittedAt);
    if (dischargedAt) {
      patient.dischargedAt = dischargedAt instanceof Date ? dischargedAt : new Date(dischargedAt);
    }

    return patient;
  }

  async getRiskProfile(patientId: string): Promise<any> {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found`);

    try {
      const prompt = `Analyze this patient's profile to predict potential clinical health risks and recommend screening checks.
Patient Name: ${patient.name}
Age: ${patient.age}
Gender: ${patient.gender}
Blood Group: ${patient.bloodGroup || 'Not specified'}
Bed Required / Admitted: ${patient.bedRequired ? 'Yes' : 'No'}

Return ONLY valid JSON with this exact shape:
{
  "potentialRisks": ["Risk 1", "Risk 2"],
  "recommendedVitalsMonitoring": ["Vitals check 1", "Vitals check 2"],
  "generalHealthGuidelines": "Age and gender specific guidelines summary"
}`;

      const response = await llmInstance.invoke([
        new SystemMessage('You are a helpful clinical risk analysis assistant. Respond in JSON only.'),
        new HumanMessage(prompt),
      ]);

      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      // Fallback
    }

    return {
      potentialRisks: ['Routine monitoring required based on age group'],
      recommendedVitalsMonitoring: ['Blood Pressure', 'Heart Rate', 'Body Temperature'],
      generalHealthGuidelines: 'Maintain a balanced diet and regular screening checks.',
    };
  }
}
