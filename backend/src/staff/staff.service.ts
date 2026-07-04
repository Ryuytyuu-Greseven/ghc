import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StaffRepository } from '../repositories/staff.repository';
import {
  CoverageRequest,
  CoverageRequestDocument,
} from '../schemas/coverage-request.schema';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types';
import { Hospital, HospitalDocument } from '../schemas/hospital.schema';
import { UserRepository } from '../repositories/user.repository';

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
export class StaffService {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly usersService: UsersService,
    @InjectModel(CoverageRequest.name)
    private readonly coverageRequestModel: Model<CoverageRequestDocument>,
    private readonly notificationsService: NotificationsService,
    @InjectModel(Hospital.name)
    private readonly hospitalModel: Model<HospitalDocument>,
    private readonly userRepository: UserRepository,
  ) { }

  async findAll(filter: object = {}) {
    const list = await this.staffRepository.findAll(filter);
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

  async findFiltered(options: {
    hospitalId?: string;
    role?: string;
    status?: 'active' | 'inactive' | 'all';
    name?: string;
  } = {}) {
    const filter: Record<string, unknown> = {};
    if (options.hospitalId) filter.hospitalId = options.hospitalId;

    let staffList = (await this.staffRepository.findAll(filter)).map(flattenStaff);

    if (options.role) {
      staffList = staffList.filter(
        (s) => s.role?.toLowerCase() === options.role!.toLowerCase(),
      );
    }
    if (options.status === 'active') {
      staffList = staffList.filter((s) => s.isActive === true);
    } else if (options.status === 'inactive') {
      staffList = staffList.filter((s) => s.isActive === false);
    }
    if (options.name) {
      const lower = options.name.toLowerCase();
      staffList = staffList.filter((s) => {
        const fullName =
          s.displayName || `${s.firstName} ${s.lastName || ''}`.trim();
        return fullName.toLowerCase().includes(lower);
      });
    }

    return staffList;
  }

  async create(data: any, userId?: string, performedBy?: string) {
    // Validate username uniqueness in User collection if provided
    let username = data.username;
    if (username) {
      username = username.trim().toLowerCase();
      const existingUser = await this.usersService.findOneByUsername(username);
      if (existingUser) {
        throw new ConflictException(
          `Username "${data.username}" is already taken`,
        );
      }
    }

    // Hash password if provided
    let passwordHash = data.passwordHash;
    const rawPassword = passwordHash;
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

    const populated = await this.staffRepository.findById(
      (createdStaff._id as any).toString(),
    );

    if (populated && populated.email) {
      void this.notificationsService.dispatch(NotificationType.STAFF_ACCOUNT_CREATED, {
        email: populated.email,
        name: `${populated.firstName || ''} ${populated.lastName || ''}`.trim(),
        username: username,
        password: rawPassword || undefined,
      });
    }

    if (populated) {
      const admins = await this.userRepository.findAll({ role: 'Admin' });
      const targetUserIds = Array.from(new Set([
        ...admins.map(u => u._id.toString()),
        userDoc._id.toString(),
      ]));

      void this.notificationsService.dispatch(NotificationType.STAFF_CREATED, {
        staff: populated,
        targetUserIds,
        performedBy,
      });

      if (populated.hospitalId) {
        const hosp = await this.hospitalModel.findById(populated.hospitalId.toString()).exec();
        const hospitalName = hosp?.name || 'Facility';
        void this.notificationsService.dispatch(NotificationType.STAFF_ASSIGNED_TO_FACILITY, {
          staff: populated,
          hospitalName,
          targetUserIds,
          performedBy,
        });
      }
    }

    return flattenStaff(populated);
  }

  async update(id: string, data: any, userId?: string, performedBy?: string) {
    const existingStaff = await this.staffRepository.findById(id);
    if (!existingStaff) throw new NotFoundException(`Staff ${id} not found`);

    const oldHospitalId = existingStaff.hospitalId ? existingStaff.hospitalId.toString() : null;
    const newHospitalId = data.hospitalId !== undefined ? (data.hospitalId ? data.hospitalId.toString() : null) : oldHospitalId;

    const userUpdate: any = {};

    // Check username uniqueness if it's changing
    if (data.username !== undefined) {
      const newUsername = data.username
        ? data.username.trim().toLowerCase()
        : undefined;
      const oldUsername = (existingStaff.userId as any)?.username
        ?.trim()
        .toLowerCase();

      if (newUsername !== oldUsername) {
        if (newUsername) {
          const existingUser =
            await this.usersService.findOneByUsername(newUsername);
          if (existingUser) {
            throw new ConflictException(
              `Username "${data.username}" is already taken`,
            );
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
      const userIdStr =
        (existingStaff.userId as any)._id?.toString() ??
        existingStaff.userId.toString();
      if (Object.keys(userUpdate).length > 0) {
        await this.usersService.updateById(userIdStr, userUpdate);
      }
    } else {
      // Fallback: If existing staff has no userId (e.g. legacy data), create one now!
      const fallbackRole = data.role || (existingStaff as any).role || 'Doctor';
      const userDoc = await this.usersService.create({
        username: data.username
          ? data.username.trim().toLowerCase()
          : undefined,
        passwordHash: userUpdate.passwordHash || undefined,
        role: fallbackRole,
        isActive: data.isActive !== undefined ? data.isActive : true,
      });
      staffData.userId = userDoc._id;
    }

    const staff = await this.staffRepository.update(id, staffData);
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);

    const populated = await this.staffRepository.findById(id);

    if (populated) {
      const admins = await this.userRepository.findAll({ role: 'Admin' });
      const staffUserId = populated.userId ? ((populated.userId as any)._id?.toString() ?? populated.userId.toString()) : null;
      const targetUserIds = Array.from(new Set([
        ...admins.map(u => u._id.toString()),
        ...(staffUserId ? [staffUserId] : []),
      ]));

      void this.notificationsService.dispatch(NotificationType.STAFF_UPDATED, {
        staff: populated,
        targetUserIds,
        performedBy,
      });

      if (oldHospitalId !== newHospitalId) {
        if (oldHospitalId) {
          const oldHosp = await this.hospitalModel.findById(oldHospitalId).exec();
          const oldHospName = oldHosp?.name || 'Facility';
          void this.notificationsService.dispatch(NotificationType.STAFF_DEASSIGNED_FROM_FACILITY, {
            staff: populated,
            hospitalName: oldHospName,
            targetUserIds,
            performedBy,
          });
        }
        if (newHospitalId) {
          const newHosp = await this.hospitalModel.findById(newHospitalId).exec();
          const newHospName = newHosp?.name || 'Facility';
          void this.notificationsService.dispatch(NotificationType.STAFF_ASSIGNED_TO_FACILITY, {
            staff: populated,
            hospitalName: newHospName,
            targetUserIds,
            performedBy,
          });
        }
      }
    }

    return flattenStaff(populated);
  }

  async remove(id: string) {
    const existingStaff = await this.staffRepository.findById(id);
    if (!existingStaff) throw new NotFoundException(`Staff ${id} not found`);

    // Delete corresponding User if userId is present
    if (existingStaff.userId) {
      const userIdStr =
        (existingStaff.userId as any)._id?.toString() ??
        existingStaff.userId.toString();
      await this.usersService.deleteById(userIdStr);
    }

    const staff = await this.staffRepository.delete(id);
    if (!staff) throw new NotFoundException(`Staff ${id} not found`);
    return { id, removed: true };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyCoverageCron() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // 1. Deactivate/complete ended requests
    const endedRequests = await this.coverageRequestModel.find({
      status: 'Approved',
      endDate: { $lt: todayStr },
    });

    for (const req of endedRequests) {
      try {
        if (req.replacementStaffId) {
          await this.staffRepository.update(req.replacementStaffId.toString(), {
            hospitalId: req.originalReplacementHospitalId || null,
          });
        }

        const originalDoc = await this.staffRepository.findById(
          req.staffId.toString(),
        );
        if (originalDoc) {
          const newUnavailable = originalDoc.unavailableOnDays.filter(
            (d) => !req.dates.includes(d),
          );
          await this.staffRepository.update(originalDoc._id.toString(), {
            unavailableOnDays: newUnavailable,
          });
        }

        req.status = 'Completed';
        await req.save();
        console.log(
          `Cron: Deactivated ended coverage request ${req._id}. Restored replacement doctor.`,
        );
      } catch (err) {
        console.error(`Failed to restore coverage for request ${req._id}`, err);
      }
    }

    // 2. Activate starting requests
    const startingRequests = await this.coverageRequestModel.find({
      status: 'Approved',
      startDate: { $lte: todayStr },
      endDate: { $gte: todayStr },
    });

    for (const req of startingRequests) {
      try {
        if (req.replacementStaffId && req.vacantHospitalId) {
          const replacement = await this.staffRepository.findById(
            req.replacementStaffId.toString(),
          );
          if (replacement) {
            const currentHospitalId =
              replacement.hospitalId && (replacement.hospitalId as any)._id
                ? (replacement.hospitalId as any)._id.toString()
                : replacement.hospitalId?.toString() || null;
            const targetHospitalId = (req.vacantHospitalId as any)._id
              ? (req.vacantHospitalId as any)._id.toString()
              : req.vacantHospitalId.toString();

            if (currentHospitalId !== targetHospitalId) {
              await this.staffRepository.update(
                req.replacementStaffId.toString(),
                {
                  hospitalId: req.vacantHospitalId,
                },
              );
              console.log(
                `Cron: Activated coverage request ${req._id}. Assigned replacement doctor to vacant branch.`,
              );
            }
          }
        }
      } catch (err) {
        console.error(
          `Failed to activate coverage for request ${req._id}`,
          err,
        );
      }
    }
  }

  async getAvailability(userId: string) {
    const staff = await this.staffRepository.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!staff) throw new NotFoundException('Staff record not found');

    const defaultHospitalName =
      (staff.hospitalId as any)?.name || 'Unassigned (Reserved)';

    // Find all Approved coverage requests where this staff is the replacement
    const replacementRequests = await this.coverageRequestModel
      .find({
        replacementStaffId: staff._id,
        status: 'Approved',
      })
      .populate('vacantHospitalId')
      .exec();

    // Generate schedule for the next 30 days starting from today (local timezone dates)
    const schedule: any[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const current = new Date(today);
      current.setDate(today.getDate() + i);

      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Check if unavailable/off
      const isUnavailable =
        staff.unavailableOnDays && staff.unavailableOnDays.includes(dateStr);

      // Check if covering
      const activeReplacement = replacementRequests.find((req) =>
        req.dates.includes(dateStr),
      );

      let location = defaultHospitalName;
      let status = 'Working at Default Branch';
      let type = 'default';

      if (isUnavailable) {
        location = 'Off / Unavailable';
        status = 'Off';
        type = 'off';
      } else if (activeReplacement) {
        location =
          (activeReplacement.vacantHospitalId as any)?.name || 'Unknown Branch';
        status = 'Covering Duty';
        type = 'coverage';
      }

      schedule.push({
        date: dateStr,
        location,
        status,
        type,
      });
    }

    return {
      status:
        staff.unavailableOnDays && staff.unavailableOnDays.length > 0
          ? 'Unavailable'
          : 'Available',
      unavailableOnDays: staff.unavailableOnDays || [],
      schedule,
      defaultHospitalName,
    };
  }

  async updateAvailability(
    userId: string,
    status: string,
    startDate?: string,
    endDate?: string,
  ) {
    const staff = await this.staffRepository.findOne({
      userId: new Types.ObjectId(userId),
    });
    console.log(staff, 'stafffff');

    if (!staff) throw new NotFoundException('Staff record not found');

    const dates: string[] = [];
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

    if (status === 'Unavailable' && dates.length > 0) {
      const existingRequest = await this.coverageRequestModel.findOne({
        staffId: staff._id,
        status: { $ne: 'Rejected' },
        dates: { $in: dates },
      });

      if (existingRequest) {
        throw new BadRequestException(
          'A coverage request has already been raised for one or more of these dates',
        );
      }
    }

    const updated = await this.staffRepository.update(staff._id.toString(), {
      unavailableOnDays: dates,
    });

    if (status === 'Unavailable' && dates.length > 0) {
      // Find candidate replacement doctors
      const allStaff = await this.staffRepository.findAll();
      const candidates: any[] = [];

      for (const s of allStaff) {
        if (s._id.toString() === staff._id.toString()) continue;

        const user = s.userId as any;
        if (!user || user.role !== 'Doctor') continue;
        if (s.department !== staff.department) continue;

        // Check if candidate is unassigned (reserved state) or from a different branch
        const sHospitalId =
          s.hospitalId && (s.hospitalId as any)._id
            ? (s.hospitalId as any)._id.toString()
            : s.hospitalId?.toString() || null;
        const staffHospitalId =
          staff.hospitalId && (staff.hospitalId as any)._id
            ? (staff.hospitalId as any)._id.toString()
            : staff.hospitalId?.toString() || null;

        if (sHospitalId !== null && sHospitalId === staffHospitalId) continue;

        // Check availability on target dates
        const isUnavailableOnAny = dates.some(
          (d) => s.unavailableOnDays && s.unavailableOnDays.includes(d),
        );
        if (isUnavailableOnAny) continue;

        // Check overlap with other active coverage requests
        const overlappingRequests = await this.coverageRequestModel.find({
          replacementStaffId: s._id,
          status: 'Approved',
          dates: { $in: dates },
        });
        if (overlappingRequests.length > 0) continue;

        candidates.push(s);
      }

      const vacantHospitalId =
        staff.hospitalId && (staff.hospitalId as any)._id
          ? (staff.hospitalId as any)._id
          : staff.hospitalId || null;

      if (candidates.length > 0) {
        const replacement = candidates[0];
        const replacementOriginalHospitalId =
          replacement.hospitalId && replacement.hospitalId._id
            ? replacement.hospitalId._id
            : replacement.hospitalId || null;

        await this.coverageRequestModel.create({
          staffId: staff._id,
          startDate,
          endDate,
          dates,
          vacantHospitalId,
          originalReplacementHospitalId: replacementOriginalHospitalId,
          replacementStaffId: replacement._id,
          status: 'Approved',
        });

        // Reassign replacement to vacant hospital branch immediately if starting today or in the past
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        if (startDate && startDate <= todayStr) {
          await this.staffRepository.update(replacement._id.toString(), {
            hospitalId: vacantHospitalId,
          });
        }
      } else {
        await this.coverageRequestModel.create({
          staffId: staff._id,
          startDate,
          endDate,
          dates,
          vacantHospitalId,
          status: 'Pending',
        });
      }
    } else if (status === 'Available') {
      // Revert/complete active and pending requests
      await this.coverageRequestModel.updateMany(
        { staffId: staff._id, status: 'Pending' },
        { status: 'Rejected' },
      );

      const activeRequests = await this.coverageRequestModel.find({
        staffId: staff._id,
        status: 'Approved',
      });

      for (const req of activeRequests) {
        if (req.replacementStaffId) {
          await this.staffRepository.update(req.replacementStaffId.toString(), {
            hospitalId: req.originalReplacementHospitalId || null,
          });
        }
        req.status = 'Completed';
        await req.save();
      }
    }

    return {
      status:
        updated &&
          updated.unavailableOnDays &&
          updated.unavailableOnDays.length > 0
          ? 'Unavailable'
          : 'Available',
      unavailableOnDays: updated?.unavailableOnDays || [],
    };
  }

  async getCoverageRequests() {
    const list = await this.coverageRequestModel
      .find()
      .populate({
        path: 'staffId',
        populate: { path: 'userId' },
      })
      .populate({
        path: 'replacementStaffId',
        populate: { path: 'userId' },
      })
      .populate('vacantHospitalId')
      .sort({ createdAt: -1 })
      .exec();

    return list.map((req) => {
      const obj = req.toObject();
      if (obj.staffId && typeof obj.staffId === 'object') {
        const staffObj = obj.staffId as any;
        staffObj.name =
          staffObj.displayName ||
          `${staffObj.firstName || ''} ${staffObj.lastName || ''}`.trim() ||
          'Unnamed';
      }
      if (
        obj.replacementStaffId &&
        typeof obj.replacementStaffId === 'object'
      ) {
        const repObj = obj.replacementStaffId as any;
        repObj.name =
          repObj.displayName ||
          `${repObj.firstName || ''} ${repObj.lastName || ''}`.trim() ||
          'Unnamed';
      }
      return obj;
    });
  }

  async assignReplacement(requestId: string, replacementStaffId: string) {
    const req = await this.coverageRequestModel.findById(requestId);
    if (!req) throw new NotFoundException('Coverage request not found');

    const replacement = await this.staffRepository.findById(replacementStaffId);
    if (!replacement)
      throw new NotFoundException('Replacement staff not found');

    const replacementOriginalHospitalId =
      replacement.hospitalId && (replacement.hospitalId as any)._id
        ? (replacement.hospitalId as any)._id
        : replacement.hospitalId || null;

    req.originalReplacementHospitalId = replacementOriginalHospitalId;
    req.replacementStaffId = replacement._id;
    req.status = 'Approved';
    await req.save();

    // Reassign replacement to vacant hospital branch immediately if starting today or in the past
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (req.startDate && req.startDate <= todayStr) {
      await this.staffRepository.update(replacementStaffId, {
        hospitalId: req.vacantHospitalId,
      });
    }

    return req;
  }

  async getAvailableDoctors(date: string) {
    if (!date) {
      throw new BadRequestException('Date is required');
    }

    let dateStr = date;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Date is already in YYYY-MM-DD format
    } else {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestException(
          'Invalid date format. Expected YYYY-MM-DD.',
        );
      }
      const yyyy = parsedDate.getFullYear();
      const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(parsedDate.getDate()).padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
    }

    const staffList = await this.staffRepository.findAll({
      unavailableOnDays: { $ne: dateStr },
    });

    const availableDoctors = staffList.filter((s) => {
      const user = s.userId as any;
      return user && user.role === UserRole.DOCTOR;
    });

    return availableDoctors.map((s) => {
      const doctorName =
        s.displayName || `${s.firstName} ${s.lastName || ''}`.trim();
      const userId =
        s.userId && (s.userId as any)._id
          ? (s.userId as any)._id.toString()
          : s.userId.toString();
      return {
        doctorName: `${doctorName} - ${s.department}`,
        userId,
      };
    });
  }
}
