# GitHub Copilot Instructions — Healthcare Platform Backend

## Stack
- NestJS 11, TypeScript 5, Mongoose 9, MongoDB
- Package manager: npm
- Module resolution: `nodenext`

## Architecture
Domain-Driven Design. Layers in strict order:
`Controller → Service → Repository → MongoDB`

Never query MongoDB from a Service. Never put business logic in a Controller.

## Project layout
```
src/schemas/          Mongoose schemas (shared)
src/repositories/     Data access layer (shared)
src/hospitals/        Domain module
src/patients/         Domain module
src/medicines/        Domain module
src/staff/            Domain module
```

## Coding rules

### Mongoose 9 compatibility
- `FilterQuery<T>` does not exist → use `object` for filter params
- `UpdateQuery<T>` exists → `import type { UpdateQuery } from 'mongoose'`

### Schema pattern
```typescript
@Schema({ timestamps: true })
export class Hospital {
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ default: true }) isActive: boolean;
}
export const HospitalSchema = SchemaFactory.createForClass(Hospital);
export type HospitalDocument = Hospital & Document;
```

### Repository pattern
Standard methods: `findAll(filter?)`, `findById(id)`, `findOne(filter)`, `create(data)`, `update(id, data)`, `delete(id)`, `count(filter?)`

### Service pattern
Inject repository, not model. Throw `NotFoundException` when record is null.

### Module pattern
```typescript
@Module({
  imports: [MongooseModule.forFeature([{ name: Entity.name, schema: EntitySchema }])],
  providers: [EntityService, EntityHelperService, EntityRepository],
  controllers: [EntityController],
  exports: [EntityRepository],
})
```

### Route ordering
Specific routes before wildcard `/:id` in every controller.

## Environment
`MONGODB_URI` and `PORT` loaded via `@nestjs/config` from `.env`.
