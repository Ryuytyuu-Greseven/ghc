import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from '../schemas/notification.schema';
import { NotificationRepository } from '../repositories/notification.repository';
import { EmailService } from './email.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsGatewayService } from './notifications-gateway.service';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    NotificationRepository,
    NotificationsGateway,
    NotificationsGatewayService,
  ],
  exports: [NotificationsService, NotificationsGatewayService, EmailService],
})
export class NotificationsModule {}
