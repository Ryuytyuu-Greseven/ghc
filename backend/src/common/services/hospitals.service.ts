import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { HospitalRepository } from '../../repositories/hospital.repository';
import { BedAllocationRepository } from '../../repositories/bed-allocation.repository';
import { Types } from 'mongoose';

@Injectable()
export class HospitalsCommonService {
  constructor(
    private readonly hospitalRepository: HospitalRepository,
    private readonly bedAllocationRepository: BedAllocationRepository,
  ) {}

  async areBedsAvailable(hospitalId: string): Promise<boolean> {
    let hospital = await this.hospitalRepository.findById(hospitalId);
    if (!hospital) {
      hospital = await this.hospitalRepository.findCurrentByHospitalId(hospitalId);
    }
    
    if (!hospital || !hospital.isActive) {
      throw new NotFoundException(`Active hospital record not found for ID: ${hospitalId}`);
    }

    if (!hospital.isCurrent) {
      const current = await this.hospitalRepository.findCurrentByHospitalId(
        hospital.hospitalId || hospital._id.toString(),
      );
      if (current) {
        hospital = current;
      }
    }

    return hospital.isActive && hospital.availableBeds > 0;
  }

  async allocateBed(hospitalId: string, patientId: string): Promise<any> {
    const available = await this.areBedsAvailable(hospitalId);
    if (!available) {
      throw new BadRequestException('No beds available at this hospital');
    }

    let hospital = await this.hospitalRepository.findById(hospitalId);
    if (!hospital) {
      hospital = await this.hospitalRepository.findCurrentByHospitalId(hospitalId);
    }
    
    if (!hospital) {
      throw new NotFoundException(`Active hospital record not found for ID: ${hospitalId}`);
    }

    if (!hospital.isCurrent) {
      const current = await this.hospitalRepository.findCurrentByHospitalId(
        hospital.hospitalId || hospital._id.toString(),
      );
      if (current) {
        hospital = current;
      }
    }

    if (!hospital) {
      throw new NotFoundException(`Active hospital record not found for ID: ${hospitalId}`);
    }

    const logicalId = hospital.hospitalId || hospital._id.toString();

    // Update the availableBeds directly on the current document in-place
    const updatedHospital = await this.hospitalRepository.update(hospital._id.toString(), {
      availableBeds: hospital.availableBeds - 1,
    });

    // Create an audit record for bed allocation
    await this.bedAllocationRepository.create({
      hospitalId: new Types.ObjectId(logicalId),
      patientId: new Types.ObjectId(patientId),
      status: 'ALLOCATED',
      allocatedAt: new Date(),
      deallocatedAt: null,
    });

    return updatedHospital;
  }

  async deallocateBed(hospitalId: string, patientId: string): Promise<any> {
    let hospital = await this.hospitalRepository.findById(hospitalId);
    if (!hospital) {
      hospital = await this.hospitalRepository.findCurrentByHospitalId(hospitalId);
    }
    
    if (!hospital || !hospital.isActive) {
      throw new NotFoundException(`Active hospital record not found for ID: ${hospitalId}`);
    }

    if (!hospital.isCurrent) {
      const current = await this.hospitalRepository.findCurrentByHospitalId(
        hospital.hospitalId || hospital._id.toString(),
      );
      if (current) {
        hospital = current;
      }
    }

    // Double check if the resolved record is active
    if (!hospital) {
      throw new NotFoundException(`Active hospital record not found for ID: ${hospitalId}`);
    }

    if (!hospital.isActive) {
      throw new NotFoundException(`Active hospital record not found for ID: ${hospitalId}`);
    }

    const logicalId = hospital.hospitalId || hospital._id.toString();

    // Update the availableBeds directly on the current document in-place
    const updatedHospital = await this.hospitalRepository.update(hospital._id.toString(), {
      availableBeds: hospital.availableBeds + 1,
    });

    // Find and update the active bed allocation record to DEALLOCATED
    const activeAllocation = await this.bedAllocationRepository.findOne({
      hospitalId: new Types.ObjectId(logicalId),
      patientId: new Types.ObjectId(patientId),
      status: 'ALLOCATED',
    });

    if (activeAllocation) {
      await this.bedAllocationRepository.update(activeAllocation._id.toString(), {
        status: 'DEALLOCATED',
        deallocatedAt: new Date(),
      });
    }

    return updatedHospital;
  }
}
