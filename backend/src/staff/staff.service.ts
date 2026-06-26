import { Injectable, NotFoundException } from '@nestjs/common';
import { StaffRepository } from '../repositories/staff.repository';
import { Staff } from '../schemas/staff.schema';

@Injectable()
export class StaffService {
  constructor(private readonly staffRepository: StaffRepository) { }

  async findAll() {
    return this.staffRepository.findAll({ isActive: true });
  }

  async findOne(id: string) {
    const staff = await this.staffRepository.findById(id);
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);
    return staff;
  }

  async findByHospital(hospitalId: string) {
    return this.staffRepository.findByHospital(hospitalId);
  }

  async create(data: Partial<Staff>) {
    return this.staffRepository.create(data);
  }

  async update(id: string, data: Partial<Staff>) {
    const staff = await this.staffRepository.update(id, data);
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);
    return staff;
  }

  async remove(id: string) {
    const staff = await this.staffRepository.delete(id);
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);
    return { id, removed: true };
  }
}
