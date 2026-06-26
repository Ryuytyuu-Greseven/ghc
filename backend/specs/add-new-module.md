# How to Add a New Domain Module

**Use this checklist every time a new domain is added.**  
Example domain used below: `appointments` (singular: `appointment`).

---

## Step 1 — Create the Schema

**File:** `src/schemas/appointment.schema.ts`

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true })
  hospitalId: Types.ObjectId;

  @Prop({ default: 'scheduled', enum: ['scheduled', 'completed', 'cancelled'] })
  status: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
```

---

## Step 2 — Create the Repository

**File:** `src/repositories/appointment.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { Appointment, AppointmentDocument } from '../schemas/appointment.schema';

@Injectable()
export class AppointmentRepository {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<AppointmentDocument[]> {
    return this.appointmentModel.find(filter).populate('patientId').populate('hospitalId').exec();
  }

  async findById(id: string): Promise<AppointmentDocument | null> {
    return this.appointmentModel.findById(id).populate('patientId').populate('hospitalId').exec();
  }

  async findOne(filter: object): Promise<AppointmentDocument | null> {
    return this.appointmentModel.findOne(filter).exec();
  }

  async findByPatient(patientId: string): Promise<AppointmentDocument[]> {
    return this.appointmentModel.find({ patientId }).exec();
  }

  async create(data: Partial<Appointment>): Promise<AppointmentDocument> {
    return this.appointmentModel.create(data);
  }

  async update(id: string, data: UpdateQuery<AppointmentDocument>): Promise<AppointmentDocument | null> {
    return this.appointmentModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<AppointmentDocument | null> {
    return this.appointmentModel.findByIdAndDelete(id).exec();
  }

  async count(filter: object = {}): Promise<number> {
    return this.appointmentModel.countDocuments(filter).exec();
  }
}
```

---

## Step 3 — Create the Module Folder

Create `src/appointments/` with four files:

### `src/appointments/appointments-helper.service.ts`
```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppointmentsHelperService {
  // Add utility methods for this domain here
}
```

### `src/appointments/appointments.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentRepository } from '../repositories/appointment.repository';
import { Appointment } from '../schemas/appointment.schema';

@Injectable()
export class AppointmentsService {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async findAll() {
    return this.appointmentRepository.findAll({ isActive: true });
  }

  async findOne(id: string) {
    const record = await this.appointmentRepository.findById(id);
    if (!record) throw new NotFoundException(`Appointment ${id} not found`);
    return record;
  }

  async create(data: Partial<Appointment>) {
    return this.appointmentRepository.create(data);
  }

  async update(id: string, data: Partial<Appointment>) {
    const record = await this.appointmentRepository.update(id, data);
    if (!record) throw new NotFoundException(`Appointment ${id} not found`);
    return record;
  }

  async remove(id: string) {
    const record = await this.appointmentRepository.delete(id);
    if (!record) throw new NotFoundException(`Appointment ${id} not found`);
    return { id, removed: true };
  }
}
```

### `src/appointments/appointments.controller.ts`
```typescript
import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // Specific sub-routes BEFORE /:id
  @Get('by-patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.appointmentsService.findByPatient(patientId);
  }

  @Get()
  findAll() { return this.appointmentsService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.appointmentsService.findOne(id); }

  @Post()
  create(@Body() body: Record<string, any>) { return this.appointmentsService.create(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.appointmentsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.appointmentsService.remove(id); }
}
```

### `src/appointments/appointments.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentsHelperService } from './appointments-helper.service';
import { Appointment, AppointmentSchema } from '../schemas/appointment.schema';
import { AppointmentRepository } from '../repositories/appointment.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }])],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsHelperService, AppointmentRepository],
  exports: [AppointmentRepository],
})
export class AppointmentsModule {}
```

---

## Step 4 — Register in AppModule

**File:** `src/app.module.ts`

```typescript
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({ ... }),
    HospitalsModule,
    PatientsModule,
    MedicinesModule,
    StaffModule,
    AppointmentsModule,   // ← add here
  ],
  ...
})
export class AppModule {}
```

---

## Step 5 — Verify

```bash
npx tsc --noEmit   # must produce zero errors
npm run start:dev  # must start without crash
```

---

## Checklist Summary

- [ ] `src/schemas/<singular>.schema.ts` created
- [ ] `src/repositories/<singular>.repository.ts` created
- [ ] `src/<plural>/` folder created with 4 files
- [ ] Module registered in `src/app.module.ts`
- [ ] `npx tsc --noEmit` passes
