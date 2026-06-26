# Healthcare Platform — Backend

## Project Purpose
NestJS REST API for a healthcare management platform. Manages hospitals, patients, medicines, and staff via MongoDB.

## Tech Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js 22 + TypeScript 5 |
| Framework | NestJS 11 |
| Database | MongoDB via Mongoose 9 |
| Config | `@nestjs/config` + `.env` |
| Module Resolution | `nodenext` (ESM-aware) |

## Commands
```bash
npm run start:dev    # watch mode (development)
npm run build        # compile to dist/
npm run start:prod   # run compiled dist/main.js
npm run lint         # eslint --fix
npm run test         # jest unit tests
npm run test:e2e     # jest e2e tests
```

## Environment Variables
Copy `.env.example` → `.env` and fill in:
```
MONGODB_URI=mongodb://localhost:27017/healthcare
PORT=3000
```

## Architecture — Domain-Driven Design (DDD)
Three strict layers. Never skip a layer or import across them sideways.

```
HTTP Request
    ↓
Controller          src/<domain>/<domain>.controller.ts
    ↓
Service             src/<domain>/<domain>.service.ts
    ↓
Repository          src/repositories/<domain>.repository.ts
    ↓
MongoDB (Mongoose)  src/schemas/<domain>.schema.ts
```

Helper services (`<domain>-helper.service.ts`) live inside the module folder and hold reusable utilities/formatters for that domain only. They are injected into the Service, never the Controller.

## Source Layout
```
src/
├── schemas/               ← shared Mongoose schemas (one per domain)
│   ├── hospital.schema.ts
│   ├── patient.schema.ts
│   ├── medicine.schema.ts
│   └── staff.schema.ts
├── repositories/          ← shared data-access layer
│   ├── hospital.repository.ts
│   ├── patient.repository.ts
│   ├── medicine.repository.ts
│   └── staff.repository.ts
├── hospitals/             ← domain module
│   ├── hospitals.module.ts
│   ├── hospitals.controller.ts
│   ├── hospitals.service.ts
│   └── hospitals-helper.service.ts
├── patients/
├── medicines/
├── staff/
├── app.module.ts          ← root module: MongoDB + all domain modules
└── main.ts
```

## Conventions

### File naming
- Schemas: `src/schemas/<singular>.schema.ts`
- Repositories: `src/repositories/<singular>.repository.ts`
- Module folder: `src/<plural>/`
- Files inside: `<plural>.module.ts`, `<plural>.controller.ts`, `<plural>.service.ts`, `<plural>-helper.service.ts`

### Schemas
Use `@nestjs/mongoose` decorators. Always export both the class and `SchemaFactory.createForClass()`.
```ts
export type HospitalDocument = Hospital & Document;

@Schema({ timestamps: true })
export class Hospital {
  @Prop({ required: true, trim: true })
  name: string;
  // ...
}

export const HospitalSchema = SchemaFactory.createForClass(Hospital);
```

### Repositories
- Inject the model with `@InjectModel(Entity.name)`
- `FilterQuery` was removed in Mongoose 9 — use `object` for filter params
- Import `UpdateQuery` as `import type { UpdateQuery } from 'mongoose'`
- Always return `Document | null` for single-record methods
- Standard methods: `findAll(filter?)`, `findById(id)`, `findOne(filter)`, `create(data)`, `update(id, data)`, `delete(id)`, `count(filter?)`

### Services
- Inject the Repository (not the Mongoose model directly)
- Throw `NotFoundException` when a record is not found
- Async everywhere

### Controllers
- Inject the Service only
- Use `@Param`, `@Body`, `@Query` decorators from `@nestjs/common`
- Prefix domain-specific sub-routes before `/:id` to avoid route conflicts
  - e.g. `GET /patients/by-hospital/:hospitalId` before `GET /patients/:id`

### Modules
Every domain module follows this exact pattern:
```ts
@Module({
  imports: [MongooseModule.forFeature([{ name: Entity.name, schema: EntitySchema }])],
  controllers: [EntityController],
  providers: [EntityService, EntityHelperService, EntityRepository],
  exports: [EntityRepository],   // export repo so other modules can inject it
})
```

### TypeScript
- `noImplicitAny: false` — untyped locals are fine for internal helpers
- `moduleResolution: nodenext` — named imports from CommonJS packages may need the default import pattern
- No comments unless the WHY is non-obvious
- No abstraction for single-use logic

## Adding a New Module
See `specs/add-new-module.md` for the full step-by-step checklist.

## API Reference
See `specs/api-contracts.md` for all endpoints.

## Data Models
See `specs/data-models.md` for full schema field reference.
