# API Contracts

**Status:** Active  
**Last updated:** 2026-06-27  
**Base URL:** `http://localhost:3000`

All endpoints return JSON. No authentication layer yet — add it as a NestJS Guard when required.

---

## Hospitals — `/hospitals`

| Method | Path | Description |
|---|---|---|
| GET | `/hospitals` | List all active hospitals |
| GET | `/hospitals/:id` | Get hospital by MongoDB ObjectId |
| POST | `/hospitals` | Create a hospital |
| PUT | `/hospitals/:id` | Update hospital fields |
| DELETE | `/hospitals/:id` | Delete a hospital |

### POST /hospitals — request body
```json
{
  "name": "City General Hospital",
  "location": "New York",
  "beds": 500,
  "phone": "+1-212-555-0100",
  "email": "admin@citygeneral.com"
}
```

---

## Patients — `/patients`

| Method | Path | Description |
|---|---|---|
| GET | `/patients` | List all active patients |
| GET | `/patients/by-hospital/:hospitalId` | Patients filtered by hospital |
| GET | `/patients/:id` | Get patient by id (populates hospitalId) |
| POST | `/patients` | Create a patient |
| PUT | `/patients/:id` | Update patient fields |
| DELETE | `/patients/:id` | Delete a patient |

> **Route order matters:** `/by-hospital/:hospitalId` must be declared before `/:id` in the controller.

### POST /patients — request body
```json
{
  "name": "John Doe",
  "age": 34,
  "bloodGroup": "O+",
  "phone": "+1-212-555-0200",
  "email": "john.doe@email.com",
  "address": "123 Main St, New York",
  "hospitalId": "<MongoDB ObjectId>"
}
```

---

## Medicines — `/medicines`

| Method | Path | Description |
|---|---|---|
| GET | `/medicines` | List all medicines |
| GET | `/medicines/available` | In-stock medicines (`isAvailable: true, stock > 0`) |
| GET | `/medicines/category/:category` | Filter by category |
| GET | `/medicines/:id` | Get medicine by id |
| POST | `/medicines` | Create a medicine |
| PUT | `/medicines/:id` | Update medicine fields |
| DELETE | `/medicines/:id` | Delete a medicine |

> **Route order matters:** `/available` and `/category/:cat` before `/:id`.

### POST /medicines — request body
```json
{
  "name": "Paracetamol",
  "dosage": "500mg",
  "stock": 1000,
  "manufacturer": "PharmaCo",
  "category": "Analgesic",
  "expiryDate": "2027-12-31",
  "pricePerUnit": 0.5
}
```

---

## Staff — `/staff`

| Method | Path | Description |
|---|---|---|
| GET | `/staff` | List all active staff |
| GET | `/staff/by-hospital/:hospitalId` | Staff filtered by hospital |
| GET | `/staff/by-role/:role` | Staff filtered by role |
| GET | `/staff/:id` | Get staff member by id (populates hospitalId) |
| POST | `/staff` | Create a staff member |
| PUT | `/staff/:id` | Update staff fields |
| DELETE | `/staff/:id` | Delete a staff member |

### POST /staff — request body
```json
{
  "name": "Dr. Emily Clarke",
  "role": "Doctor",
  "department": "Cardiology",
  "phone": "+1-212-555-0300",
  "email": "emily.clarke@hospital.com",
  "hospitalId": "<MongoDB ObjectId>"
}
```

Valid `role` values: `Doctor` | `Nurse` | `Pharmacist` | `Technician` | `Admin`

---

## Common Response Shapes

### Successful list
```json
[
  { "_id": "...", "name": "...", "createdAt": "...", "updatedAt": "..." }
]
```

### Successful single record
```json
{ "_id": "...", "name": "...", "createdAt": "...", "updatedAt": "..." }
```

### Delete success
```json
{ "id": "<id>", "removed": true }
```

### Not found (404)
```json
{ "statusCode": 404, "message": "Hospital <id> not found", "error": "Not Found" }
```
