import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientRepository } from '../repositories/patient.repository';
import { Patient } from '../schemas/patient.schema';

@Injectable()
export class PatientsService {
  constructor(private readonly patientRepository: PatientRepository) {}

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

  async create(data: Partial<Patient>) {
    return this.patientRepository.create(data);
  }

  async update(id: string, data: Partial<Patient>) {
    const patient = await this.patientRepository.update(id, data);
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    return patient;
  }

  async remove(id: string) {
    const patient = await this.patientRepository.delete(id);
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    return { id, removed: true };
  }
}
