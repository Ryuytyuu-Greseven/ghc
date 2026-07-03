import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NotificationRepository } from '../repositories/notification.repository';
import { EmailService } from './email.service';
import {
  notificationTypeConfig,
  NotificationType,
} from './notification-types';
import { NotificationDocument } from '../schemas/notification.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly emailService: EmailService,
  ) {}

  async dispatch(type: NotificationType, payload: unknown): Promise<void> {
    const config = notificationTypeConfig[type];
    if (!config) {
      this.logger.warn(`Unknown notification type: ${type}`);
      return;
    }
    const inAppItems = config.buildInApp(payload);
    if (inAppItems.length > 0) {
      await this.notificationRepository.createMany(
        inAppItems.map(item => ({
          userId: new Types.ObjectId(item.userId),
          type,
          category: config.category,
          title: item.title,
          body: item.body,
          read: false,
          metadata: item.metadata ?? {},
        })),
      );
    }

    const emailItems = config.buildEmails(payload);
    for (const email of emailItems) {
      try {
        await this.emailService.send(email);
      } catch (err) {
        this.logger.error(`Email dispatch failed for ${type}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  async findByUser(userId: string) {
    const docs = await this.notificationRepository.findByUser(userId);
    return docs.map(doc => this.toResponse(doc));
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.countUnread(userId);
    return { count };
  }

  async markRead(id: string, userId: string) {
    const doc = await this.notificationRepository.markRead(id, userId);
    if (!doc) throw new NotFoundException(`Notification ${id} not found`);
    return this.toResponse(doc);
  }

  async markAllRead(userId: string) {
    await this.notificationRepository.markAllRead(userId);
    return { success: true };
  }

  async dismiss(id: string, userId: string) {
    const doc = await this.notificationRepository.delete(id, userId);
    if (!doc) throw new NotFoundException(`Notification ${id} not found`);
    return { id, removed: true };
  }

  private toResponse(doc: NotificationDocument) {
    return {
      id: doc._id.toString(),
      type: doc.type,
      category: doc.category,
      title: doc.title,
      body: doc.body,
      read: doc.read,
      metadata: doc.metadata,
      createdAt: (doc as any).createdAt,
    };
  }
}
