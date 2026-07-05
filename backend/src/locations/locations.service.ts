import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { Types, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { StateRepository } from '../repositories/state.repository';
import { DistrictRepository } from '../repositories/district.repository';
import { StateDocument } from '../schemas/state.schema';
import { DistrictDocument } from '../schemas/district.schema';

@Injectable()
export class LocationsService implements OnModuleInit {
  private stateByCode = new Map<number, StateDocument>();
  private districtByCode = new Map<number, DistrictDocument>();

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly stateRepo: StateRepository,
    private readonly districtRepo: DistrictRepository,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  async refreshCache() {
    try {
      const states = await this.stateRepo.findAllActive();
      const districts = await this.districtRepo.findAllActive();

      this.stateByCode.clear();
      states.forEach(s => this.stateByCode.set(s.code, s));

      this.districtByCode.clear();
      districts.forEach(d => this.districtByCode.set(d.code, d));

      console.log(`Locations Cache populated: ${this.stateByCode.size} states, ${this.districtByCode.size} districts.`);
    } catch (err) {
      console.error('Failed to populate locations cache:', err);
    }
  }

  getStateName(code: number | null | undefined): string {
    if (code === null || code === undefined) return '';
    const state = this.stateByCode.get(Number(code));
    return state ? state.name : '';
  }

  getDistrictName(code: number | null | undefined): string {
    if (code === null || code === undefined) return '';
    const district = this.districtByCode.get(Number(code));
    return district ? district.name : '';
  }

  async getStates() {
    return this.stateRepo.findAllActive();
  }

  async getDistricts(stateId: string) {
    let stateCode: number;

    if (Types.ObjectId.isValid(stateId)) {
      const state = await this.stateRepo.findOne({ _id: new Types.ObjectId(stateId) });
      if (!state) {
        throw new NotFoundException(`State with ID ${stateId} not found`);
      }
      stateCode = state.code;
    } else {
      stateCode = parseInt(stateId, 10);
      if (isNaN(stateCode)) {
        throw new NotFoundException(`Invalid stateId: ${stateId}`);
      }
    }

    return this.districtRepo.findActiveByState(stateCode);
  }

  async migrateOldData() {
    const db = this.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const stateCode = 28; // Andhra Pradesh
    const districtCode = 520; // Visakhapatnam

    const staffRes = await db.collection('staffs').updateMany(
      {},
      { $set: { state: stateCode, city: districtCode } }
    );

    const hospitalRes = await db.collection('hospitals').updateMany(
      {},
      { $set: { state: stateCode, city: districtCode } }
    );

    const patientRes = await db.collection('patients').updateMany(
      {},
      { $set: { state: stateCode, city: districtCode } }
    );

    return {
      success: true,
      message: 'Migration completed successfully',
      staffUpdatedCount: staffRes.modifiedCount,
      hospitalsUpdatedCount: hospitalRes.modifiedCount,
      patientsUpdatedCount: patientRes.modifiedCount,
    };
  }
}
