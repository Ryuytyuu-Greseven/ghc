import { PatientDocument } from '../schemas/patient.schema';
import { PatientDataDocument } from '../schemas/patient-data.schema';
import { HospitalDocument } from '../schemas/hospital.schema';
import { StaffDocument } from '../schemas/staff.schema';
import {
  doctorAssignedDoctorTemplate,
  doctorAssignedPatientTemplate,
  medicinesAssignedTemplate,
  patientOnboardedTemplate,
  hospitalOnboardedTemplate,
  hospitalUpdatedTemplate,
  staffAccountCreatedTemplate,
  inventoryRequestProcessedTemplate,
  inventoryRequestRaisedTemplate,
} from './email-templates';

export enum NotificationType {
  PATIENT_ONBOARDED = 'PATIENT_ONBOARDED',
  PATIENT_ASSIGNED_TO_DOCTOR = 'PATIENT_ASSIGNED_TO_DOCTOR',
  PATIENT_MEDICINES_ASSIGNED = 'PATIENT_MEDICINES_ASSIGNED',
  HOSPITAL_ONBOARDED = 'HOSPITAL_ONBOARDED',
  HOSPITAL_UPDATED = 'HOSPITAL_UPDATED',
  STAFF_ACCOUNT_CREATED = 'STAFF_ACCOUNT_CREATED',
  STAFF_CREATED = 'STAFF_CREATED',
  STAFF_UPDATED = 'STAFF_UPDATED',
  STAFF_ASSIGNED_TO_FACILITY = 'STAFF_ASSIGNED_TO_FACILITY',
  STAFF_DEASSIGNED_FROM_FACILITY = 'STAFF_DEASSIGNED_FROM_FACILITY',
  INVENTORY_REQUEST_PROCESSED = 'INVENTORY_REQUEST_PROCESSED',
  INVENTORY_REQUEST_RAISED = 'INVENTORY_REQUEST_RAISED',
  PATIENT_MEDICINE_SERVE_REMINDER = 'PATIENT_MEDICINE_SERVE_REMINDER',
}

export type InAppNotificationItem = {
  userId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export type EmailNotificationItem = {
  to: string;
  subject: string;
  html: string;
};

export type PatientOnboardedPayload = {
  patient: PatientDocument;
  hospitalName?: string;
};

export type PatientAssignedToDoctorPayload = {
  patient: PatientDocument;
  visit: PatientDataDocument;
  doctorUserId: string;
  doctorName: string;
  doctorEmail?: string;
};

export type PatientMedicinesAssignedPayload = {
  patient: PatientDocument;
  visit: PatientDataDocument;
  medicines: { name: string; quantity: number }[];
};

export type HospitalOnboardedPayload = {
  hospital: HospitalDocument;
  targetUserIds?: string[];
  performedBy?: string;
};

export type HospitalUpdatedPayload = {
  hospital: HospitalDocument;
  changes: string;
  targetUserIds?: string[];
  performedBy?: string;
};

export type StaffAccountCreatedPayload = {
  email: string;
  name: string;
  username: string;
  password?: string;
};

export type StaffCreatedPayload = {
  staff: StaffDocument;
  targetUserIds?: string[];
  performedBy?: string;
};

export type StaffUpdatedPayload = {
  staff: StaffDocument;
  targetUserIds?: string[];
  performedBy?: string;
};

export type StaffAssignedPayload = {
  staff: StaffDocument;
  hospitalName: string;
  targetUserIds?: string[];
  performedBy?: string;
};

export type StaffDeassignedPayload = {
  staff: StaffDocument;
  hospitalName: string;
  targetUserIds?: string[];
  performedBy?: string;
};

export type InventoryRequestProcessedPayload = {
  request: any;
  performedBy: string;
  status: string;
  userId: string;
  email?: string;
};

export type InventoryRequestRaisedPayload = {
  request: any;
  performedBy: string;
  branchName?: string;
  targetAdmins: { id: string; email?: string }[];
};
export type PatientMedicineServeReminderPayload = {
  nurseUserId: string;
  patientName: string;
  medicineName: string;
  quantity: number;
  session: string;
};

type NotificationTypeConfig = {
  category: 'info' | 'success' | 'warning';
  buildInApp: (payload: unknown) => InAppNotificationItem[];
  buildEmails: (payload: unknown) => EmailNotificationItem[];
};

function hospitalLabel(
  patient: PatientDocument,
  hospitalName?: string,
): string {
  if (hospitalName) return hospitalName;
  const hospital = patient.hospitalId as { name?: string } | undefined;
  return hospital?.name ?? 'the hospital';
}

export const notificationTypeConfig: Record<
  NotificationType,
  NotificationTypeConfig
> = {
  [NotificationType.PATIENT_ONBOARDED]: {
    category: 'success',
    buildInApp: () => [],
    buildEmails: (payload: unknown) => {
      const { patient, hospitalName } = payload as PatientOnboardedPayload;
      if (!patient.email) return [];
      const facility = hospitalLabel(patient, hospitalName);
      return [
        {
          to: patient.email,
          subject: 'Welcome to GHC — Registration Successful',
          html: patientOnboardedTemplate(patient.name, facility),
        },
      ];
    },
  },

  [NotificationType.PATIENT_ASSIGNED_TO_DOCTOR]: {
    category: 'info',
    buildInApp: (payload: unknown) => {
      const { patient, visit, doctorUserId } =
        payload as PatientAssignedToDoctorPayload;
      if (!doctorUserId) return [];
      return [
        {
          userId: doctorUserId,
          title: 'New patient assigned',
          body: `Patient ${patient.name} has been assigned to you for ${visit.problem || 'a visit'}.`,
          metadata: {
            patientId: patient._id.toString(),
            visitId: visit._id.toString(),
            doctorUserId,
          },
        },
      ];
    },
    buildEmails: (payload: unknown) => {
      const { patient, visit, doctorName, doctorEmail } =
        payload as PatientAssignedToDoctorPayload;
      const emails: EmailNotificationItem[] = [];

      if (patient.email) {
        emails.push({
          to: patient.email,
          subject: 'Your Doctor Has Been Assigned — GHC',
          html: doctorAssignedPatientTemplate(patient.name, doctorName),
        });
      }

      if (doctorEmail) {
        const visitDate = visit.visitDate
          ? new Date(visit.visitDate).toLocaleDateString()
          : 'the scheduled date';
        emails.push({
          to: doctorEmail,
          subject: 'New Patient Assigned — GHC',
          html: doctorAssignedDoctorTemplate(
            doctorName,
            patient.name,
            visit.problem || 'General visit',
            visitDate,
          ),
        });
      }

      return emails;
    },
  },

  [NotificationType.PATIENT_MEDICINES_ASSIGNED]: {
    category: 'info',
    buildInApp: () => [],
    buildEmails: (payload: unknown) => {
      const { patient, visit, medicines } =
        payload as PatientMedicinesAssignedPayload;
      if (!patient.email || medicines.length === 0) return [];

      const visitDate = visit.visitDate
        ? new Date(visit.visitDate).toLocaleDateString()
        : 'your recent visit';

      return [
        {
          to: patient.email,
          subject: 'Your Prescribed Medicines — GHC',
          html: medicinesAssignedTemplate(
            patient.name,
            visitDate,
            visit.doctor,
            medicines,
          ),
        },
      ];
    },
  },

  [NotificationType.PATIENT_MEDICINE_SERVE_REMINDER]: {
    category: 'warning',
    buildInApp: (payload: unknown) => {
      const { nurseUserId, patientName, medicineName, quantity, session } =
        payload as PatientMedicineServeReminderPayload;
      if (!nurseUserId) return [];
      return [
        {
          userId: nurseUserId,
          title: 'Serve Medicine Reminder',
          body: `Please serve ${quantity}x ${medicineName} to patient ${patientName} for the ${session} session.`,
          metadata: {
            patientName,
            medicineName,
            quantity,
            session,
          },
        },
      ];
    },
    buildEmails: () => [],
  },

  [NotificationType.HOSPITAL_ONBOARDED]: {
    category: 'success',
    buildInApp: (payload: unknown) => {
      const { hospital, targetUserIds, performedBy } = payload as HospitalOnboardedPayload;
      if (!targetUserIds || targetUserIds.length === 0) return [];
      const creator = performedBy ? ` by ${performedBy}` : '';
      return targetUserIds.map(userId => ({
        userId,
        title: 'Hospital onboarded successfully',
        body: `Facility "${hospital.name}" (${hospital.type}) has been successfully onboarded in ${hospital.city}${creator}.`,
        metadata: {
          hospitalId: hospital._id.toString(),
          name: hospital.name,
          type: hospital.type,
          city: hospital.city,
          performedBy,
        },
      }));
    },
    buildEmails: (payload: unknown) => {
      const { hospital } = payload as HospitalOnboardedPayload;
      if (!hospital.email) return [];
      return [{
        to: hospital.email,
        subject: 'Welcome to GHC — Facility Registration Successful',
        html: hospitalOnboardedTemplate(hospital.name, hospital.type, String(hospital.city)),
      }];
    },
  },

  [NotificationType.HOSPITAL_UPDATED]: {
    category: 'info',
    buildInApp: (payload: unknown) => {
      const { hospital, targetUserIds, performedBy } = payload as HospitalUpdatedPayload;
      if (!targetUserIds || targetUserIds.length === 0) return [];
      const updater = performedBy ? ` by ${performedBy}` : '';
      return targetUserIds.map(userId => ({
        userId,
        title: 'Hospital profile updated',
        body: `Facility profile for "${hospital.name}" has been updated${updater}.`,
        metadata: {
          hospitalId: hospital._id.toString(),
          name: hospital.name,
          performedBy,
        },
      }));
    },
    buildEmails: (payload: unknown) => {
      const { hospital, changes } = payload as HospitalUpdatedPayload;
      if (!hospital.email) return [];
      return [{
        to: hospital.email,
        subject: 'Facility Profile Updated — GHC',
        html: hospitalUpdatedTemplate(hospital.name, changes),
      }];
    },
  },

  [NotificationType.STAFF_ACCOUNT_CREATED]: {
    category: 'success',
    buildInApp: () => [],
    buildEmails: (payload: unknown) => {
      const { email, name, username, password } = payload as StaffAccountCreatedPayload;
      if (!email) return [];
      return [{
        to: email,
        subject: 'Welcome to GHC — Your Staff Account Credentials',
        html: staffAccountCreatedTemplate(name, username, password),
      }];
    },
  },

  [NotificationType.STAFF_CREATED]: {
    category: 'success',
    buildInApp: (payload: unknown) => {
      const { staff, targetUserIds, performedBy } = payload as StaffCreatedPayload;
      if (!targetUserIds || targetUserIds.length === 0) return [];
      const staffName = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
      const byUser = performedBy ? ` by ${performedBy}` : '';
      return targetUserIds.map(userId => ({
        userId,
        title: 'Staff registered successfully',
        body: `Staff member "${staffName}" (${staff.designation || 'Staff'}) has been successfully registered${byUser}.`,
        metadata: {
          staffId: staff._id.toString(),
          name: staffName,
          role: staff.designation || 'Staff',
          performedBy,
        },
      }));
    },
    buildEmails: () => [],
  },

  [NotificationType.STAFF_UPDATED]: {
    category: 'info',
    buildInApp: (payload: unknown) => {
      const { staff, targetUserIds, performedBy } = payload as StaffUpdatedPayload;
      if (!targetUserIds || targetUserIds.length === 0) return [];
      const staffName = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
      const byUser = performedBy ? ` by ${performedBy}` : '';
      return targetUserIds.map(userId => ({
        userId,
        title: 'Staff profile updated',
        body: `Staff profile for "${staffName}" has been updated${byUser}.`,
        metadata: {
          staffId: staff._id.toString(),
          name: staffName,
          performedBy,
        },
      }));
    },
    buildEmails: () => [],
  },

  [NotificationType.STAFF_ASSIGNED_TO_FACILITY]: {
    category: 'success',
    buildInApp: (payload: unknown) => {
      const { staff, hospitalName, targetUserIds, performedBy } = payload as StaffAssignedPayload;
      if (!targetUserIds || targetUserIds.length === 0) return [];
      const staffName = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
      const byUser = performedBy ? ` by ${performedBy}` : '';
      return targetUserIds.map(userId => ({
        userId,
        title: 'Staff assigned to facility',
        body: `Staff member "${staffName}" has been assigned to ${hospitalName}${byUser}.`,
        metadata: {
          staffId: staff._id.toString(),
          name: staffName,
          facility: hospitalName,
          performedBy,
        },
      }));
    },
    buildEmails: () => [],
  },

  [NotificationType.STAFF_DEASSIGNED_FROM_FACILITY]: {
    category: 'warning',
    buildInApp: (payload: unknown) => {
      const { staff, hospitalName, targetUserIds, performedBy } = payload as StaffDeassignedPayload;
      if (!targetUserIds || targetUserIds.length === 0) return [];
      const staffName = `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
      const byUser = performedBy ? ` by ${performedBy}` : '';
      return targetUserIds.map(userId => ({
        userId,
        title: 'Staff de-assigned from facility',
        body: `Staff member "${staffName}" has been de-assigned from ${hospitalName}${byUser}.`,
        metadata: {
          staffId: staff._id.toString(),
          name: staffName,
          facility: hospitalName,
          performedBy,
        },
      }));
    },
    buildEmails: () => [],
  },

  [NotificationType.INVENTORY_REQUEST_PROCESSED]: {
    category: 'info',
    buildInApp: (payload: unknown) => {
      const { request, performedBy, status, userId } =
        payload as InventoryRequestProcessedPayload;
      if (!userId) return [];
      const statusLower = status.toLowerCase();
      return [
        {
          userId,
          title: `Inventory Request ${status}`,
          body: `Your inventory request #${request.requestNumber} was ${statusLower} by ${performedBy}.`,
          metadata: {
            requestId: request._id.toString(),
            requestNumber: request.requestNumber,
            status,
            performedBy,
          },
        },
      ];
    },
    buildEmails: (payload: unknown) => {
      const { request, performedBy, status, email } =
        payload as InventoryRequestProcessedPayload;
      if (!email) return [];
      return [
        {
          to: email,
          subject: `Inventory Request #${request.requestNumber}: ${status}`,
          html: inventoryRequestProcessedTemplate(
            request.requestNumber,
            status,
            performedBy,
            request.remarks,
          ),
        },
      ];
    },
  },

  [NotificationType.INVENTORY_REQUEST_RAISED]: {
    category: 'info',
    buildInApp: (payload: unknown) => {
      const { request, performedBy, branchName, targetAdmins } =
        payload as InventoryRequestRaisedPayload;
      if (!targetAdmins || targetAdmins.length === 0) return [];
      const facility = branchName ? ` for branch "${branchName}"` : '';
      return targetAdmins.map((admin) => ({
        userId: admin.id,
        title: 'New Inventory Request Raised',
        body: `A new inventory request #${request.requestNumber} was raised by ${performedBy}${facility}.`,
        metadata: {
          requestId: request._id.toString(),
          requestNumber: request.requestNumber,
          branchId: request.branchId.toString(),
          performedBy,
        },
      }));
    },
    buildEmails: (payload: unknown) => {
      const { request, performedBy, branchName, targetAdmins } =
        payload as InventoryRequestRaisedPayload;
      const emails: EmailNotificationItem[] = [];
      
      for (const admin of targetAdmins) {
        if (admin.email) {
          emails.push({
            to: admin.email,
            subject: `New Inventory Request Raised: #${request.requestNumber}`,
            html: inventoryRequestRaisedTemplate(
              request.requestNumber,
              performedBy,
              branchName,
            ),
          });
        }
      }
      return emails;
    },
  },
};
