import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HospitalsModule } from './hospitals/hospitals.module';
import { PatientsModule } from './patients/patients.module';
import { MedicinesModule } from './medicines/medicines.module';
import { StaffModule } from './staff/staff.module';
import { ChatGatewayModule } from './chat-gateway/chat-gateway.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { InventoryModule } from './inventory/inventory.module';
import { config } from 'dotenv';
config();


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    HospitalsModule,
    PatientsModule,
    MedicinesModule,
    StaffModule,
    ChatGatewayModule,
    AuthModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
