import { PatientDocument } from '../schemas/patient.schema';
import { PatientDataDocument } from '../schemas/patient-data.schema';
import {
  doctorAssignedDoctorTemplate,
  doctorAssignedPatientTemplate,
  medicinesAssignedTemplate,
  patientOnboardedTemplate,
} from './email-templates';

export enum NotificationType {
  PATIENT_ONBOARDED = 'PATIENT_ONBOARDED',
  PATIENT_ASSIGNED_TO_DOCTOR = 'PATIENT_ASSIGNED_TO_DOCTOR',
  PATIENT_MEDICINES_ASSIGNED = 'PATIENT_MEDICINES_ASSIGNED',
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

type NotificationTypeConfig = {
  category: 'info' | 'success' | 'warning';
  buildInApp: (payload: unknown) => InAppNotificationItem[];
  buildEmails: (payload: unknown) => EmailNotificationItem[];
};

function hospitalLabel(patient: PatientDocument, hospitalName?: string): string {
  if (hospitalName) return hospitalName;
  const hospital = patient.hospitalId as { name?: string } | undefined;
  return hospital?.name ?? 'the hospital';
}

export const notificationTypeConfig: Record<NotificationType, NotificationTypeConfig> = {
  [NotificationType.PATIENT_ONBOARDED]: {
    category: 'success',
    buildInApp: () => [],
    buildEmails: (payload: unknown) => {
      const { patient, hospitalName } = payload as PatientOnboardedPayload;
      if (!patient.email) return [];
      const facility = hospitalLabel(patient, hospitalName);
      return [{
        to: patient.email,
        subject: 'Welcome to GHC — Registration Successful',
        html: patientOnboardedTemplate(patient.name, facility),
      }];
    },
  },

  [NotificationType.PATIENT_ASSIGNED_TO_DOCTOR]: {
    category: 'info',
    buildInApp: (payload: unknown) => {
      const { patient, visit, doctorUserId } = payload as PatientAssignedToDoctorPayload;
      if (!doctorUserId) return [];
      return [{
        userId: doctorUserId,
        title: 'New patient assigned',
        body: `Patient ${patient.name} has been assigned to you for ${visit.problem || 'a visit'}.`,
        metadata: {
          patientId: patient._id.toString(),
          visitId: visit._id.toString(),
          doctorUserId,
        },
      }];
    },
    buildEmails: (payload: unknown) => {
      const { patient, visit, doctorName, doctorEmail } = payload as PatientAssignedToDoctorPayload;
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
      const { patient, visit, medicines } = payload as PatientMedicinesAssignedPayload;
      if (!patient.email || medicines.length === 0) return [];

      const visitDate = visit.visitDate
        ? new Date(visit.visitDate).toLocaleDateString()
        : 'your recent visit';

      return [{
        to: patient.email,
        subject: 'Your Prescribed Medicines — GHC',
        html: medicinesAssignedTemplate(
          patient.name,
          visitDate,
          visit.doctor,
          medicines,
        ),
      }];
    },
  },
};
