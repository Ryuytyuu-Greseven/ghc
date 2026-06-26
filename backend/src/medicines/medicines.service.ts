import { Injectable, NotFoundException } from '@nestjs/common';
import { MedicineRepository } from '../repositories/medicine.repository';
import { Medicine } from '../schemas/medicine.schema';

@Injectable()
export class MedicinesService {
  constructor(private readonly medicineRepository: MedicineRepository) {}

  async findAll() {
    return this.medicineRepository.findAll();
  }

  async findOne(id: string) {
    const medicine = await this.medicineRepository.findById(id);
    if (!medicine) throw new NotFoundException(`Medicine ${id} not found`);
    return medicine;
  }

  async findAvailable() {
    return this.medicineRepository.findAvailable();
  }

  async findByCategory(category: string) {
    return this.medicineRepository.findByCategory(category);
  }

  async create(data: Partial<Medicine>) {
    return this.medicineRepository.create(data);
  }

  async update(id: string, data: Partial<Medicine>) {
    const medicine = await this.medicineRepository.update(id, data);
    if (!medicine) throw new NotFoundException(`Medicine ${id} not found`);
    return medicine;
  }

  async remove(id: string) {
    const medicine = await this.medicineRepository.delete(id);
    if (!medicine) throw new NotFoundException(`Medicine ${id} not found`);
    return { id, removed: true };
  }
}
