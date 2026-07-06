import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export type NotificationSocketPayload = {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

@Injectable()
export class NotificationsGatewayService {
  private readonly logger = new Logger(NotificationsGatewayService.name);
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitNewNotification(userId: string, notification: NotificationSocketPayload) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  emitUnreadCount(userId: string, count: number) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit('notification:unread-count', { count });
  }
}
