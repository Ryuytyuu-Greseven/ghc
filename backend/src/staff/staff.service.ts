import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StaffRepository } from '../repositories/staff.repository';
import { Staff } from '../schemas/staff.schema';
import { CoverageRequest, CoverageRequestDocument } from '../schemas/coverage-request.schema';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

function flattenStaff(staff: any) {
  if (!staff) return null;
  const obj = staff.toObject ? staff.toObject() : staff;
  if (obj.userId && typeof obj.userId === 'object') {
    obj.username = obj.userId.username;
    obj.role = obj.userId.role;
    obj.isActive = obj.userId.isActive;
    // Set userId to string ID reference
    obj.userId = obj.userId._id ?? obj.userId.id;
  }
  return obj;
}

@Injectable()
export class StaffService implements OnModuleInit {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly usersService: UsersService,
    @InjectModel(CoverageRequest.name)
    private readonly coverageRequestModel: Model<CoverageRequestDocument>,
  ) { }

  async findAll() {
    const list = await this.staffRepository.findAll();
    return list.map(flattenStaff);
  }

  async findOne(id: string) {
    const staff = await this.staffRepository.findById(id);
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);
    return flattenStaff(staff);
  }

  async findByHospital(hospitalId: string) {
    const list = await this.staffRepository.findByHospital(hospitalId);
    return list.map(flattenStaff);
  }

  async create(data: any) {
    // Validate username uniqueness in User collection if provided
    let username = data.username;
    if (username) {
      username = username.trim().toLowerCase();
      const existingUser = await this.usersService.findOneByUsername(username);
      if (existingUser) {
        throw new ConflictException(`Username "${data.username}" is already taken`);
      }
    }

    // Hash password if provided
    let passwordHash = data.passwordHash;
    if (passwordHash) {
      passwordHash = await bcrypt.hash(passwordHash, 10);
    }

    // Create User record
    const userDoc = await this.usersService.create({
      username: username || undefined,
      passwordHash: passwordHash || undefined,
      role: data.role || 'Doctor',
      isActive: data.isActive !== undefined ? data.isActive : true,
    });

    // Create Staff record referencing User
    const staffData = { ...data };
    delete staffData.role;
    delete staffData.username;
    delete staffData.passwordHash;
    delete staffData.password;
    delete staffData.isActive;

    staffData.userId = userDoc._id;

    const createdStaff = await this.staffRepository.create(staffData);

    const populated = await this.staffRepository.findById((createdStaff._id as any).toString());
    return flattenStaff(populated);
  }

  async update(id: string, data: any) {
    const existingStaff = await this.staffRepository.findById(id);
    if (!existingStaff) throw new NotFoundException(`Staff ${id} not found`);

    const userUpdate: any = {};

    // Check username uniqueness if it's changing
    if (data.username !== undefined) {
      const newUsername = data.username ? data.username.trim().toLowerCase() : undefined;
      const oldUsername = (existingStaff.userId as any)?.username?.trim().toLowerCase();

      if (newUsername !== oldUsername) {
        if (newUsername) {
          const existingUser = await this.usersService.findOneByUsername(newUsername);
          if (existingUser) {
            throw new ConflictException(`Username "${data.username}" is already taken`);
          }
        }
        userUpdate.username = newUsername || null;
      }
    }

    // Hash password if provided
    if (data.passwordHash) {
      userUpdate.passwordHash = await bcrypt.hash(data.passwordHash, 10);
    }

    if (data.role !== undefined) {
      userUpdate.role = data.role;
    }

    if (data.isActive !== undefined) {
      userUpdate.isActive = data.isActive;
    }

    // Filter staff fields
    const staffData = { ...data };
    delete staffData.role;
    delete staffData.username;
    delete staffData.passwordHash;
    delete staffData.password;
    delete staffData.isActive;

    // Sync to User collection
    if (existingStaff.userId) {
      const userIdStr = (existingStaff.userId as any)._id?.toString() ?? existingStaff.userId.toString();
      if (Object.keys(userUpdate).length > 0) {
        await this.usersService.updateById(userIdStr, userUpdate);
      }
    } else {
      // Fallback: If existing staff has no userId (e.g. legacy data), create one now!
      const fallbackRole = data.role || (existingStaff as any).role || 'Doctor';
      const userDoc = await this.usersService.create({
        username: data.username ? data.username.trim().toLowerCase() : undefined,
        passwordHash: userUpdate.passwordHash || undefined,
        role: fallbackRole,
        isActive: data.isActive !== undefined ? data.isActive : true,
      });
      staffData.userId = userDoc._id;
    }

    const staff = await this.staffRepository.update(id, staffData);
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);

    const populated = await this.staffRepository.findById(id);
    return flattenStaff(populated);
  }

  async remove(id: string) {
    const existingStaff = await this.staffRepository.findById(id);
    if (!existingStaff) throw new NotFoundException(`Staff ${id} not found`);

    // Delete corresponding User if userId is present
    if (existingStaff.userId) {
      const userIdStr = (existingStaff.userId as any)._id?.toString() ?? existingStaff.userId.toString();
      await this.usersService.deleteById(userIdStr);
    }

    const staff = await this.staffRepository.delete(id);
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);
    return { id, removed: true };
  }

  async onModuleInit() {
    this.startDailyCoverageCron();
  }

  startDailyCoverageCron() {
    const runCron = () => {
      this.runDailyCoverageCron().catch(e => console.error('Daily coverage cron failed', e));
      scheduleNext();
    };

    const scheduleNext = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0, 0
      );
      const msUntilMidnight = nextMidnight.getTime() - now.getTime();
      setTimeout(runCron, msUntilMidnight);
    };

    scheduleNext();
  }

  async runDailyCoverageCron() {
    const todayStr = new Date().toISOString().split('T')[0];
    const endedRequests = await this.coverageRequestModel.find({
      status: 'Approved',
      endDate: { $lt: todayStr },
    });

    for (const req of endedRequests) {
      try {
        if (req.replacementStaffId && req.originalReplacementHospitalId) {
          await this.staffRepository.update(
            req.replacementStaffId.toString(),
            { hospitalId: req.originalReplacementHospitalId }
          );
        }

        const originalDoc = await this.staffRepository.findById(req.staffId.toString());
        if (originalDoc) {
          const newUnavailable = originalDoc.unavailableOnDays.filter(
            d => !req.dates.includes(d)
          );
          await this.staffRepository.update(originalDoc._id.toString(), {
            unavailableOnDays: newUnavailable,
          });
        }

        req.status = 'Completed';
        await req.save();
      } catch (err) {
        console.error(`Failed to restore coverage for request ${req._id}`, err);
      }
    }
  }

  async getAvailability(userId: string) {
    const staff = await this.staffRepository.findOne({ userId: new Types.ObjectId(userId) });

    if (!staff) throw new NotFoundException('Staff record not found');
    return {
      status: staff.unavailableOnDays && staff.unavailableOnDays.length > 0 ? 'Unavailable' : 'Available',
      unavailableOnDays: staff.unavailableOnDays || [],
    };
  }

  async updateAvailability(userId: string, status: string, startDate?: string, endDate?: string) {
    const staff = await this.staffRepository.findOne({ userId: new Types.ObjectId(userId) });
    console.log(staff, "stafffff")

    if (!staff) throw new NotFoundException('Staff record not found');

    let dates: string[] = [];
    if (status === 'Unavailable' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const current = new Date(start);
        while (current <= end) {
          dates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }
    }

    const updated = await this.staffRepository.update(staff._id.toString(), {
      unavailableOnDays: dates,
    });

    if (status === 'Unavailable' && dates.length > 0) {
      await this.coverageRequestModel.create({
        staffId: staff._id,
        startDate,
        endDate,
        dates,
        vacantHospitalId: staff.hospitalId,
        status: 'Pending',
      });
    } else if (status === 'Available') {
      // Revert/complete active and pending requests
      await this.coverageRequestModel.updateMany(
        { staffId: staff._id, status: 'Pending' },
        { status: 'Rejected' }
      );

      const activeRequests = await this.coverageRequestModel.find({
        staffId: staff._id,
        status: 'Approved',
      });

      for (const req of activeRequests) {
        if (req.replacementStaffId && req.originalReplacementHospitalId) {
          await this.staffRepository.update(
            req.replacementStaffId.toString(),
            { hospitalId: req.originalReplacementHospitalId }
          );
        }
        req.status = 'Completed';
        await req.save();
      }
    }

    return {
      status: updated && updated.unavailableOnDays && updated.unavailableOnDays.length > 0 ? 'Unavailable' : 'Available',
      unavailableOnDays: updated?.unavailableOnDays || [],
    };
  }

  async getCoverageRequests() {
    return this.coverageRequestModel
      .find()
      .populate({
        path: 'staffId',
        populate: { path: 'userId' }
      })
      .populate({
        path: 'replacementStaffId',
        populate: { path: 'userId' }
      })
      .populate('vacantHospitalId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async assignReplacement(requestId: string, replacementStaffId: string) {
    const req = await this.coverageRequestModel.findById(requestId);
    if (!req) throw new NotFoundException('Coverage request not found');

    const replacement = await this.staffRepository.findById(replacementStaffId);
    if (!replacement) throw new NotFoundException('Replacement staff not found');

    // Save replacement's current branch and update request info
    req.originalReplacementHospitalId = replacement.hospitalId;
    req.replacementStaffId = replacement._id;
    req.status = 'Approved';
    await req.save();

    // Reassign replacement to vacant hospital branch
    await this.staffRepository.update(replacementStaffId, {
      hospitalId: req.vacantHospitalId,
    });

    return req;
  }
}
