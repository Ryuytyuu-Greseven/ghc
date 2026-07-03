import { Injectable } from '@nestjs/common';

import { HospitalRepository } from '../../repositories/hospital.repository';
import { BedAllocationRepository } from '../../repositories/bed-allocation.repository';
import { BranchInventoryRepository } from '../../repositories/branch-inventory.repository';
import { StaffRepository } from '../../repositories/staff.repository';
import { PatientRepository } from '../../repositories/patient.repository';

export interface InterventionAlert {
  branchId: string;
  branchName: string;
  branchType: string;
  type: 'Bed Shortage' | 'Severe Stockout' | 'Staff Crunch';
  severity: 'High' | 'Medium';
  metric: string;
  justification: string;
  timestamp: Date;
  details?: {
    occupancyPct?: number;
    availableBeds?: number;
    outOfStockCount?: number;
    totalItemsCount?: number;
    patientCount?: number;
    staffCount?: number;
  };
}

@Injectable()
export class FacilityAlertsService {
  constructor(
    private readonly hospitalRepository: HospitalRepository,
    private readonly bedAllocationRepository: BedAllocationRepository,
    private readonly branchInventoryRepository: BranchInventoryRepository,
    private readonly staffRepository: StaffRepository,
    private readonly patientRepository: PatientRepository,
  ) {}

  async getInterventionAlerts(): Promise<InterventionAlert[]> {
    const alerts: InterventionAlert[] = [];
    const hospitals = await this.hospitalRepository.findAll({ isActive: true });

    for (const hosp of hospitals) {
      const branchId = hosp._id.toString();
      const branchName = hosp.name;
      const branchType = hosp.type; // e.g. PHC / CHC

      // 1. Bed Shortage Flagging
      if (hosp.totalBeds > 0) {
        const occupancyPct = Math.round(((hosp.totalBeds - hosp.availableBeds) / hosp.totalBeds) * 100);
        if (occupancyPct > 85 || hosp.availableBeds <= 2) {
          alerts.push({
            branchId,
            branchName,
            branchType,
            type: 'Bed Shortage',
            severity: occupancyPct >= 95 || hosp.availableBeds === 0 ? 'High' : 'Medium',
            metric: `${occupancyPct}% Occupancy (${hosp.availableBeds} beds left)`,
            justification: `Critical capacity reached. Occupancy is at ${occupancyPct}% with only ${hosp.availableBeds} beds remaining.`,
            timestamp: new Date(),
            details: {
              occupancyPct,
              availableBeds: hosp.availableBeds,
            },
          });
        }
      }

      // 2. Severe Stockout Flagging
      const stockItems = await this.branchInventoryRepository.findByBranch(branchId);
      if (stockItems.length > 0) {
        const outOfStock = stockItems.filter((item) => item.availableQty <= 0);
        const stockoutRatio = outOfStock.length / stockItems.length;
        if (stockoutRatio > 0.25 || outOfStock.length >= 5) {
          alerts.push({
            branchId,
            branchName,
            branchType,
            type: 'Severe Stockout',
            severity: stockoutRatio > 0.4 ? 'High' : 'Medium',
            metric: `${Math.round(stockoutRatio * 100)}% Drugs Out of Stock`,
            justification: `${outOfStock.length} out of ${stockItems.length} monitored items are completely out of stock. Immediate replenishment or redistribution is recommended.`,
            timestamp: new Date(),
            details: {
              outOfStockCount: outOfStock.length,
              totalItemsCount: stockItems.length,
            },
          });
        }
      }

      // 3. Staff Crunch Flagging
      const activePatients = await this.patientRepository.findByHospital(branchId);
      const activeCount = activePatients.filter((p) => p.isActive !== false).length;
      const staffList = await this.staffRepository.findByHospital(branchId);
      const staffCount = staffList.length;

      if (activeCount > 5) {
        const ratio = staffCount > 0 ? activeCount / staffCount : activeCount;
        if (ratio > 10) {
          alerts.push({
            branchId,
            branchName,
            branchType,
            type: 'Staff Crunch',
            severity: ratio >= 15 || staffCount === 0 ? 'High' : 'Medium',
            metric: `${ratio.toFixed(1)}:1 Patient-to-Staff Ratio`,
            justification: `High patient workload with ${activeCount} active patients and only ${staffCount} assigned staff members. Urgent staffing coverage intervention required.`,
            timestamp: new Date(),
            details: {
              patientCount: activeCount,
              staffCount,
            },
          });
        }
      }
    }

    return alerts;
  }
}
