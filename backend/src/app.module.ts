import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HospitalsModule } from './hospitals/hospitals.module';
import { PatientsModule } from './patients/patients.module';
import { StaffModule } from './staff/staff.module';
import { ChatGatewayModule } from './chat-gateway/chat-gateway.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { InventoryModule } from './inventory/inventory.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { PatientDataModule } from './patient-data/patient-data.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuditInterceptor } from './audit-logs/audit.interceptor';
import { ReportsModule } from './reports/reports.module';
import { DiagnosticTestsModule } from './diagnostic-tests/diagnostic-tests.module';
import { TwilioModule } from './twilio/twilio.module';
import { config } from 'dotenv';
config();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    CommonModule,
    HospitalsModule,
    PatientsModule,
    StaffModule,
    ChatGatewayModule,
    AuthModule,
    InventoryModule,
    UsersModule,
    PatientDataModule,
    NotificationsModule,
    AuditLogsModule,
    ReportsModule,
    DiagnosticTestsModule,
    TwilioModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
