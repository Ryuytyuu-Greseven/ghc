# AGENTS — Healthcare Platform Backend

> This file is the canonical project specification for AI coding agents (Claude, Cursor, Windsurf, Copilot, etc.).
> Read this before making any changes. Every decision here is intentional.

---

## What This Project Is
A NestJS REST API backend for a healthcare management platform.
It manages four core domains: **Hospitals**, **Patients**, **Medicines**, and **Staff**.
The database is **MongoDB**, accessed via **Mongoose 9**.

---

## Architecture Contract

This project follows **Domain-Driven Design (DDD)**. The layering is strict and must not be violated:

```
Controller  →  Service  →  Repository  →  MongoDB
```

- **Controllers** handle HTTP only. No business logic.
- **Services** hold business logic. They call the Repository — never Mongoose directly.
- **Repositories** own all DB queries. They wrap the Mongoose model.
- **Schemas** define the Mongoose document shape. They live in `src/schemas/` and are shared.
- **Helper Services** (`<domain>-helper.service.ts`) hold reusable utility logic within a domain (formatting, transformation). Injected by the Service, not the Controller.

Cross-domain data access: export the Repository from the module and import it in the consuming module. Never import a Service from another domain.

---

## Directory Structure (source of truth)

```
src/
├── schemas/                        shared Mongoose schemas
│   ├── hospital.schema.ts
│   ├── patient.schema.ts
│   ├── medicine.schema.ts
│   └── staff.schema.ts
├── repositories/                   shared data-access layer
│   ├── hospital.repository.ts
│   ├── patient.repository.ts
│   ├── medicine.repository.ts
│   └── staff.repository.ts
├── hospitals/
│   ├── hospitals.module.ts
│   ├── hospitals.controller.ts
│   ├── hospitals.service.ts
│   └── hospitals-helper.service.ts
├── patients/
│   ├── patients.module.ts
│   ├── patients.controller.ts
│   ├── patients.service.ts
│   └── patients-helper.service.ts
├── medicines/
│   ├── medicines.module.ts
│   ├── medicines.controller.ts
│   ├── medicines.service.ts
│   └── medicines-helper.service.ts
├── staff/
│   ├── staff.module.ts
│   ├── staff.controller.ts
│   ├── staff.service.ts
│   └── staff-helper.service.ts
├── app.module.ts
└── main.ts
```

---

## Canonical Module Pattern

Every domain module is identical in structure. When adding a new one, copy this pattern exactly.

### 1. Schema — `src/schemas/<singular>.schema.ts`
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ExampleDocument = Example & Document;

@Schema({ timestamps: true })
export class Example {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ExampleSchema = SchemaFactory.createForClass(Example);
```

### 2. Repository — `src/repositories/<singular>.repository.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { Example, ExampleDocument } from '../schemas/example.schema';

@Injectable()
export class ExampleRepository {
  constructor(
    @InjectModel(Example.name)
    private readonly exampleModel: Model<ExampleDocument>,
  ) {}

  async findAll(filter: object = {}): Promise<ExampleDocument[]> {
    return this.exampleModel.find(filter).exec();
  }

  async findById(id: string): Promise<ExampleDocument | null> {
    return this.exampleModel.findById(id).exec();
  }

  async findOne(filter: object): Promise<ExampleDocument | null> {
    return this.exampleModel.findOne(filter).exec();
  }

  async create(data: Partial<Example>): Promise<ExampleDocument> {
    return this.exampleModel.create(data);
  }

  async update(id: string, data: UpdateQuery<ExampleDocument>): Promise<ExampleDocument | null> {
    return this.exampleModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<ExampleDocument | null> {
    return this.exampleModel.findByIdAndDelete(id).exec();
  }

  async count(filter: object = {}): Promise<number> {
    return this.exampleModel.countDocuments(filter).exec();
  }
}
```

### 3. Service — `src/<plural>/<plural>.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { ExampleRepository } from '../repositories/example.repository';
import { Example } from '../schemas/example.schema';

@Injectable()
export class ExamplesService {
  constructor(private readonly exampleRepository: ExampleRepository) {}

  async findAll() {
    return this.exampleRepository.findAll({ isActive: true });
  }

  async findOne(id: string) {
    const record = await this.exampleRepository.findById(id);
    if (!record) throw new NotFoundException(`Example ${id} not found`);
    return record;
  }

  async create(data: Partial<Example>) {
    return this.exampleRepository.create(data);
  }

  async update(id: string, data: Partial<Example>) {
    const record = await this.exampleRepository.update(id, data);
    if (!record) throw new NotFoundException(`Example ${id} not found`);
    return record;
  }

  async remove(id: string) {
    const record = await this.exampleRepository.delete(id);
    if (!record) throw new NotFoundException(`Example ${id} not found`);
    return { id, removed: true };
  }
}
```

### 4. Controller — `src/<plural>/<plural>.controller.ts`
```typescript
import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { ExamplesService } from './examples.service';

@Controller('examples')
export class ExamplesController {
  constructor(private readonly examplesService: ExamplesService) {}

  @Get()
  findAll() { return this.examplesService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.examplesService.findOne(id); }

  @Post()
  create(@Body() body: Record<string, any>) { return this.examplesService.create(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.examplesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.examplesService.remove(id); }
}
```

### 5. Module — `src/<plural>/<plural>.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamplesController } from './examples.controller';
import { ExamplesService } from './examples.service';
import { ExamplesHelperService } from './examples-helper.service';
import { Example, ExampleSchema } from '../schemas/example.schema';
import { ExampleRepository } from '../repositories/example.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: Example.name, schema: ExampleSchema }])],
  controllers: [ExamplesController],
  providers: [ExamplesService, ExamplesHelperService, ExampleRepository],
  exports: [ExampleRepository],
})
export class ExamplesModule {}
```

Register the new module in `src/app.module.ts` imports array.

---

## Critical TypeScript Rules for This Project

| Rule | Detail |
|---|---|
| `moduleResolution` | `nodenext` — always use named imports for ESM-compatible packages. For CommonJS packages (mongoose), use default import if named exports fail. |
| `FilterQuery` | **Removed in Mongoose 9.** Use `object` as the type for filter parameters. |
| `UpdateQuery` | Still exists. Import as `import type { UpdateQuery } from 'mongoose'`. |
| No `@types/mongoose` | Types are bundled with `mongoose` itself. |
| `noImplicitAny: false` | Untyped locals are acceptable inside helpers. |

---

## Route Ordering Rule
Always place specific sub-routes **before** the `/:id` wildcard in controllers:
```typescript
@Get('available')      // ← must be before :id
@Get('category/:cat')  // ← must be before :id
@Get(':id')
```

---

## Environment
```
MONGODB_URI=mongodb://localhost:27017/healthcare
PORT=3000
```
Config is loaded globally via `ConfigModule.forRoot({ isGlobal: true })`.

---

## Running Locally
```bash
npm install
cp .env.example .env
# edit .env with your MongoDB URI
npm run start:dev
```

---

## What NOT To Do
- Do not put DB queries in a Service — use the Repository
- Do not import a Service from another domain — export and import the Repository instead
- Do not add `FilterQuery` imports from mongoose (it was removed in v9)
- Do not add global validation pipes or DTOs unless explicitly asked — the codebase uses `Record<string, any>` for now
- Do not add comments explaining what code does — only add comments for non-obvious WHY
