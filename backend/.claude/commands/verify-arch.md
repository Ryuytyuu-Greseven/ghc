# Verify Architecture Compliance

Audit the entire `src/` directory and report any violations of the DDD layer contract.

Check for:

1. **DB queries in Services** — any `this.*Model` or `Model<` usage inside `*.service.ts` files (only allowed in `*.repository.ts`)

2. **Business logic in Controllers** — any `if`/`throw`/`NotFoundException` inside `*.controller.ts` files (only allowed in services)

3. **Cross-domain Service imports** — any `import { *Service }` from a sibling domain folder (only Repository cross-imports are allowed)

4. **FilterQuery usage** — any `FilterQuery` import (removed in Mongoose 9; use `object` instead)

5. **Missing repository export** — any `*.module.ts` that does not have `exports: [*Repository]`

6. **Route ordering** — in any controller, check that `@Get('static-path')` decorators appear before `@Get(':id')`

7. **Type-check** — run `npx tsc --noEmit` and include the output

Report each violation with the file path and line number. If everything is clean, confirm compliance.
