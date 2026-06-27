import { Injectable, NotFoundException } from '@nestjs/common';
import { HospitalRepository } from '../repositories/hospital.repository';
import { Hospital } from '../schemas/hospital.schema';

@Injectable()
export class HospitalsService {
  constructor(private readonly hospitalRepository: HospitalRepository) {}

  async getAllHospitals() {
    return this.hospitalRepository.findAll({ isActive: true });
  }

  async getHospitalById(id: string) {
    const hospital = await this.hospitalRepository.findById(id);
    if (!hospital) throw new NotFoundException(`Hospital ${id} not found`);
    return hospital;
  }

  async createHospital(data: Partial<Hospital>) {
    return this.hospitalRepository.create(data);
  }

  async updateHospital(id: string, data: Partial<Hospital>) {
    const hospital = await this.hospitalRepository.update(id, data);
    if (!hospital) throw new NotFoundException(`Hospital ${id} not found`);
    return hospital;
  }

  async deleteHospital(id: string) {
    const hospital = await this.hospitalRepository.delete(id);
    if (!hospital) throw new NotFoundException(`Hospital ${id} not found`);
    return { id, removed: true };
  }
}
