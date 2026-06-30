# Role-Based Access Control (RBAC) Architecture Overview

This document provides a comprehensive blueprint to transform the GHC Healthcare Management System into a secure, role-based application.

---

## 1. User Roles & Importance

| Role | Operational Importance |
| :--- | :--- |
| **Admin** | District health administrators. Full system access to configure hospitals, manage staff credentials, and view district-wide analytics. |
| **Doctor** | Clinical leads. Responsible for patient diagnosis, admissions/discharges, and submitting availability calendars. |
| **Nurse** | Ward and bed managers. Responsible for real-time patient bed allocations, admissions checklist, and ward logs. |
| **Pharmacist** | Inventory and drug logicians. Responsible for local branch drug stocks, raising transfer requests, and executing AI-driven redistributions. |
| **Receptionist** | Frontdesk managers. Responsible for creating patient records, registering demographics, and outpatient registration. |
| **Lab Technician** | Diagnostic staff. Tracks lab tests, results logging, and diagnostic inventory category levels. |
| **Cashier** | Finance staff. Manages patient billing, outpatient payments, and claims records. |

---

## 2. Screen & Action Mapping

The following matrix maps GHC's modules and actions to user roles:

| Screen / Feature | Admin | Doctor | Nurse | Pharmacist | Receptionist |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | Full | Clinical | Bed Stats | Stock Stats | General |
| **Hospitals & Clinics** | CRUD | Read | Read | Read | Read |
| **Staff Registry** | CRUD | Read | Read | Read | - |
| **My Availability** | Approve | CRUD | Read | - | - |
| **Coverage & Transfers** | Approve | Read | - | - | - |
| **Patient Records** | Read | CRUD | CRUD | - | Register |
| **Inventory Master** | CRUD | - | - | Read | - |
| **Central Stock** | CRUD | Read | - | Read | - |
| **Branch Stock** | Read | Read | - | CRUD | - |
| **Inventory Requests** | Approve | - | - | CRUD (Raise) | - |
| **AI Inventory Analytics** | Read | - | - | CRUD (Apply) | - |

> [!NOTE]
> **CRUD**: Create, Read, Update, Delete permissions.
> **Approve**: Capability to approve requests submitted by other staff.
> **Register**: Specific permission to create a patient profile but not update medical history.

---

## 3. Recommended Implementation Strategy

### A. Backend Security (NestJS)

1. **Roles Decorator**: Define a `@Roles()` decorator to specify required access levels on controllers/endpoints.
   ```typescript
   import { SetMetadata } from '@nestjs/common';
   import { UserRole } from '../common/enums/userRoles.enum';
   export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
   ```

2. **Roles Guard**: Create a `RolesGuard` to check the current user's role against the metadata:
   ```typescript
   @Injectable()
   export class RolesGuard implements CanActivate {
     constructor(private reflector: Reflector) {}
     canActivate(context: ExecutionContext): boolean {
       const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
         context.getHandler(),
         context.getClass(),
       ]);
       if (!requiredRoles) return true;
       const { user } = context.switchToHttp().getRequest();
       return requiredRoles.includes(user.role);
     }
   }
   ```

3. **Controller Guard Registration**: Apply guards to restricted endpoints:
   ```typescript
   @Controller('hospitals')
   @UseGuards(JwtAuthGuard, RolesGuard)
   export class HospitalsController {
     @Post()
     @Roles(UserRole.ADMIN)
     create(@Body() body: CreateHospitalDto) { ... }
   }
   ```

---

### B. Frontend Route & Navigation Guards (React)

1. **Role-Based Routing**: Wrap routes in a helper component that validates the active user role:
   ```tsx
   export function ProtectedRoute({ children, allowedRoles }: { children: ReactNode, allowedRoles: string[] }) {
     const { user } = useAuth();
     if (!user) return <Navigate to="/login" replace />;
     if (!allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
     return <>{children}</>;
   }
   ```

2. **Conditional Navigation**: Hide or show sidebars or subtabs using role checks:
   ```tsx
   const { user } = useAuth();
   const tabs = useMemo(() => {
     return ALL_TABS.filter(tab => !tab.roles || tab.roles.includes(user.role));
   }, [user.role]);
   ```
