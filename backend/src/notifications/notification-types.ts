import { PatientDocument } from '../schemas/patient.schema';
import { PatientDataDocument } from '../schemas/patient-data.schema';

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
        html: `
          <p>Dear ${patient.name},</p>
          <p>You have been successfully onboarded at <strong>${facility}</strong>.</p>
          <p>Your registration is complete. Our care team will be in touch if any further steps are needed.</p>
          <p>Thank you,<br/>GHC Healthcare</p>
        `,
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
          html: `
          <p>Dear ${patient.name},</p>
          <p><strong>${doctorName}</strong> has been assigned to your care.</p>
          <p>If you have questions, please contact your hospital.</p>
          <p>Thank you,<br/>GHC Healthcare</p>
        `,
        });
      }

      if (doctorEmail) {
        const visitDate = visit.visitDate
          ? new Date(visit.visitDate).toLocaleDateString()
          : 'the scheduled date';
        emails.push({
          to: doctorEmail,
          subject: 'New Patient Assigned — GHC',
          html: `
          <p>Dear ${doctorName},</p>
          <p>Patient <strong>${patient.name}</strong> has been assigned to you.</p>
          <p><strong>Visit reason:</strong> ${visit.problem || 'General visit'}</p>
          <p><strong>Visit date:</strong> ${visitDate}</p>
          <p>Please log in to the GHC portal to review the patient details.</p>
          <p>Thank you,<br/>GHC Healthcare</p>
        `,
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

      const medicineList = medicines
        .map(m => `<li>${m.name} — quantity: ${m.quantity}</li>`)
        .join('');
      const visitDate = visit.visitDate
        ? new Date(visit.visitDate).toLocaleDateString()
        : 'your recent visit';

      return [{
        to: patient.email,
        subject: 'Your Prescribed Medicines — GHC',
        html: `
          <p>Dear ${patient.name},</p>
          <p>The following medicines have been prescribed for your visit on <strong>${visitDate}</strong>:</p>
          <ul>${medicineList}</ul>
          ${visit.doctor ? `<p><strong>Prescribing doctor:</strong> ${visit.doctor}</p>` : ''}
          <p>Please follow your doctor's instructions. Contact your hospital if you have any questions.</p>
          <p>Thank you,<br/>GHC Healthcare</p>
        `,
      }];
    },
  },
};
