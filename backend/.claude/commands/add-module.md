# Add a New Domain Module

Add a complete DDD module for the domain: $ARGUMENTS

Follow `specs/add-new-module.md` exactly. Complete all five steps in order:

1. Create `src/schemas/<singular>.schema.ts` using the `@Schema({ timestamps: true })` pattern with `@Prop` decorators. Export the class, the `Document` type alias, and the `SchemaFactory` output.

2. Create `src/repositories/<singular>.repository.ts`. Inject `@InjectModel(Entity.name)`. Implement: `findAll`, `findById`, `findOne`, `create`, `update`, `delete`, `count`. Use `object` for filter params (FilterQuery was removed in Mongoose 9). Import `UpdateQuery` as `import type { UpdateQuery } from 'mongoose'`.

3. Create the `src/<plural>/` folder with all four files:
   - `<plural>-helper.service.ts` — empty `@Injectable()` class for utilities
   - `<plural>.service.ts` — inject Repository, throw `NotFoundException` when null
   - `<plural>.controller.ts` — CRUD routes; specific sub-routes before `/:id`
   - `<plural>.module.ts` — `MongooseModule.forFeature`, all providers, `exports: [EntityRepository]`

4. Add the new module to the `imports` array in `src/app.module.ts`.

5. Run `npx tsc --noEmit` and fix any errors before reporting done.
