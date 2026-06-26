# Architecture Specification

**Status:** Active  
**Last updated:** 2026-06-27

---

## Overview

The Healthcare Platform backend follows **Domain-Driven Design (DDD)** with a strict three-layer architecture. Each layer has a single responsibility and communicates only with the layer directly beneath it.

---

## Layer Diagram

```
┌─────────────────────────────────────────┐
│             HTTP Client                 │
└──────────────────┬──────────────────────┘
                   │ HTTP Request
┌──────────────────▼──────────────────────┐
│              Controller                 │  ← Route handling, param extraction
│   src/<plural>/<plural>.controller.ts   │
└──────────────────┬──────────────────────┘
                   │ method call
┌──────────────────▼──────────────────────┐
│               Service                   │  ← Business logic, orchestration
│   src/<plural>/<plural>.service.ts      │
│   src/<plural>/<plural>-helper.service  │  ← Utility functions for this domain
└──────────────────┬──────────────────────┘
                   │ method call
┌──────────────────▼──────────────────────┐
│             Repository                  │  ← All DB queries live here
│   src/repositories/<singular>.repo.ts   │
└──────────────────┬──────────────────────┘
                   │ Mongoose model
┌──────────────────▼──────────────────────┐
│              MongoDB                    │
│   src/schemas/<singular>.schema.ts      │  ← Document shape definition
└─────────────────────────────────────────┘
```

---

## Layer Responsibilities

### Controller
- Decorates routes with `@Get`, `@Post`, `@Put`, `@Delete`
- Extracts `@Param`, `@Body`, `@Query`
- Calls the Service and returns the result
- **Must not** contain business logic or conditional branching on data

### Service
- Enforces business rules (e.g., throw `NotFoundException` if record missing)
- Orchestrates calls across the Repository and Helper Service
- **Must not** import or call a Mongoose model directly

### Helper Service
- Stateless utility functions scoped to one domain
- Examples: response formatting, field transformation, domain validation helpers
- Injected into the Service, never directly into the Controller

### Repository
- Single point of contact with MongoDB
- Wraps the Mongoose model injected via `@InjectModel`
- Exposes named, typed async methods
- **Must not** contain business logic

### Schema
- Mongoose document definition using `@nestjs/mongoose` decorators
- Exports: the class, the `Document` type alias, and the `SchemaFactory` output
- Lives in `src/schemas/` (shared) so multiple repositories can reference the same schema

---

## Cross-Domain Data Access

When domain A needs data from domain B:

```
Module B → exports: [BRepository]
Module A → imports: [ModuleB]
Service A → constructor(private readonly bRepository: BRepository)
```

**Never** import a Service from another domain. Only Repositories are shared.

---

## Module Registration Flow

```
app.module.ts
├── ConfigModule.forRoot({ isGlobal: true })
├── MongooseModule.forRootAsync(...)     ← one MongoDB connection for the app
├── HospitalsModule
├── PatientsModule
├── MedicinesModule
└── StaffModule

Each domain module:
├── MongooseModule.forFeature([...])     ← registers schema for this module
├── controllers: [EntityController]
├── providers: [EntityService, EntityHelperService, EntityRepository]
└── exports: [EntityRepository]          ← allows other modules to inject it
```

---

## Why This Structure

| Decision | Reason |
|---|---|
| Schemas in `src/schemas/` (shared) | Patient references Hospital by ObjectId; both schemas must be importable without circular dependencies |
| Repositories in `src/repositories/` (shared) | Allows cross-domain injection without re-registering the schema |
| Helper service per domain | Keeps utility logic out of the Service without creating cross-domain coupling |
| Repository exported from every module | Enables future cross-domain queries cleanly |
