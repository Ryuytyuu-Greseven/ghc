import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { Medicine, MedicineDocument } from '../schemas/medicine.schema';

@Injectable()
export class MedicineRepository {
  constructor(
    @InjectModel(Medicine.name)
    private readonly medicineModel: Model<MedicineDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<MedicineDocument[]> {
    return this.medicineModel.find(filter).exec();
  }

  async findById(id: string): Promise<MedicineDocument | null> {
    return this.medicineModel.findById(id).exec();
  }

  async findOne(filter: object): Promise<MedicineDocument | null> {
    return this.medicineModel.findOne(filter).exec();
  }

  async findByCategory(category: string): Promise<MedicineDocument[]> {
    return this.medicineModel.find({ category }).exec();
  }

  async findAvailable(): Promise<MedicineDocument[]> {
    return this.medicineModel.find({ isAvailable: true, stock: { $gt: 0 } }).exec();
  }

  async create(data: Partial<Medicine>): Promise<MedicineDocument> {
    return this.medicineModel.create(data);
  }

  async update(
    id: string,
    data: UpdateQuery<MedicineDocument>,
  ): Promise<MedicineDocument | null> {
    return this.medicineModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<MedicineDocument | null> {
    return this.medicineModel.findByIdAndDelete(id).exec();
  }

  async count(filter: object = {}): Promise<number> {
    return this.medicineModel.countDocuments(filter).exec();
  }
}
