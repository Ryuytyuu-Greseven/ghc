import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async findByUser(userId: string, limit = 50): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    }).exec();
  }

  async createMany(items: Partial<Notification>[]): Promise<NotificationDocument[]> {
    if (items.length === 0) return [];
    return this.notificationModel.insertMany(items) as unknown as Promise<NotificationDocument[]>;
  }

  async markRead(id: string, userId: string): Promise<NotificationDocument | null> {
    return this.notificationModel.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { read: true },
      { new: true },
    ).exec();
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { read: true },
    ).exec();
  }

  async delete(id: string, userId: string): Promise<NotificationDocument | null> {
    return this.notificationModel.findOneAndDelete({
      _id: id,
      userId: new Types.ObjectId(userId),
    }).exec();
  }

  async update(id: string, data: UpdateQuery<NotificationDocument>): Promise<NotificationDocument | null> {
    return this.notificationModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }
}
