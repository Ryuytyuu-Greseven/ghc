import { Injectable, NotFoundException } from '@nestjs/common';
import { StaffRepository } from '../repositories/staff.repository';
import { Staff } from '../schemas/staff.schema';

@Injectable()
export class StaffService {
  constructor(private readonly staffRepository: StaffRepository) { }

  async findAll() {
    return this.staffRepository.findAll();
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
    if (!data.employeeId || data.employeeId.trim() === '') {
      const year = new Date().getFullYear().toString().slice(-2);
      const randomPart = Math.random().toString(16).substring(2, 6).toUpperCase();
      data.employeeId = `EMP-${year}${randomPart}`;
    }
    if (data.isActive === undefined) {
      data.isActive = true;
    }
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
