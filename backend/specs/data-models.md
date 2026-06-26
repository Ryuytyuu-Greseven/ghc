# Data Models Specification

**Status:** Active  
**Last updated:** 2026-06-27

All models use `@Schema({ timestamps: true })` which adds `createdAt` and `updatedAt` automatically.

---

## Hospital

**Schema file:** `src/schemas/hospital.schema.ts`  
**Collection:** `hospitals`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | ✅ | trimmed |
| `location` | String | ✅ | trimmed |
| `beds` | Number | ✅ | total bed count |
| `phone` | String | | trimmed |
| `email` | String | | trimmed, lowercased |
| `isActive` | Boolean | | default: `true` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

---

## Patient

**Schema file:** `src/schemas/patient.schema.ts`  
**Collection:** `patients`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | ✅ | trimmed |
| `age` | Number | ✅ | |
| `bloodGroup` | String | ✅ | enum: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| `phone` | String | | trimmed |
| `email` | String | | trimmed, lowercased |
| `address` | String | | trimmed |
| `hospitalId` | ObjectId | | ref: `Hospital` |
| `isActive` | Boolean | | default: `true` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

---

## Medicine

**Schema file:** `src/schemas/medicine.schema.ts`  
**Collection:** `medicines`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | ✅ | trimmed |
| `dosage` | String | ✅ | e.g. `500mg` |
| `stock` | Number | ✅ | unit count |
| `manufacturer` | String | | trimmed |
| `category` | String | | trimmed |
| `expiryDate` | Date | | |
| `pricePerUnit` | Number | ✅ | default: `0` |
| `isAvailable` | Boolean | | default: `true` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

---

## Staff

**Schema file:** `src/schemas/staff.schema.ts`  
**Collection:** `staffs`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | String | ✅ | trimmed |
| `role` | String | ✅ | enum: `Doctor`, `Nurse`, `Pharmacist`, `Technician`, `Admin` |
| `department` | String | ✅ | trimmed |
| `phone` | String | | trimmed |
| `email` | String | | trimmed, lowercased |
| `hospitalId` | ObjectId | | ref: `Hospital` |
| `isActive` | Boolean | | default: `true` |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

---

## Relationships

```
Hospital ──< Patient      (one Hospital has many Patients)
Hospital ──< Staff        (one Hospital has many Staff members)
```

`Patient.hospitalId` and `Staff.hospitalId` are MongoDB ObjectId references to the `Hospital` collection. Both repositories call `.populate('hospitalId')` on queries that may need the full hospital object.

---

## Repository Methods Per Model

Every repository exposes the same base interface plus domain-specific methods:

| Method | All repos | Patient | Medicine | Staff |
|---|---|---|---|---|
| `findAll(filter?)` | ✅ | ✅ | ✅ | ✅ |
| `findById(id)` | ✅ | ✅ | ✅ | ✅ |
| `findOne(filter)` | ✅ | ✅ | ✅ | ✅ |
| `create(data)` | ✅ | ✅ | ✅ | ✅ |
| `update(id, data)` | ✅ | ✅ | ✅ | ✅ |
| `delete(id)` | ✅ | ✅ | ✅ | ✅ |
| `count(filter?)` | ✅ | ✅ | ✅ | ✅ |
| `findByHospital(hospitalId)` | | ✅ | | ✅ |
| `findAvailable()` | | | ✅ | |
| `findByCategory(category)` | | | ✅ | |
| `findByRole(role)` | | | | ✅ |
