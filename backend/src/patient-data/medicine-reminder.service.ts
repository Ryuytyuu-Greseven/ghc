import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PatientData, PatientDataDocument } from '../schemas/patient-data.schema';
import { Patient, PatientDocument } from '../schemas/patient.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types';

@Injectable()
export class MedicineReminderService {
  private readonly logger = new Logger(MedicineReminderService.name);

  constructor(
    @InjectModel(PatientData.name)
    private readonly patientDataModel: Model<PatientDataDocument>,
    @InjectModel(Patient.name)
    private readonly patientModel: Model<PatientDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleMedicineReminders() {
    this.logger.log('Starting medicine serve reminder cron check...');
    
    // Determine current hour session mapping
    const currentHour = new Date().getHours();
    let currentSession = 'mng'; // Default morning
    if (currentHour >= 6 && currentHour < 11) {
      currentSession = 'mng';
    } else if (currentHour >= 11 && currentHour < 16) {
      currentSession = 'afternoon';
    } else if (currentHour >= 16 && currentHour < 20) {
      currentSession = 'evening';
    } else if (currentHour >= 20 && currentHour < 24) {
      currentSession = 'night';
    } else {
      currentSession = 'midnight';
    }

    try {
      // Find all visits with an assigned nurse and having medicines
      const activeVisits = await this.patientDataModel
        .find({
          nurseUserId: { $ne: null },
          medicines: { $exists: true, $not: { $size: 0 } },
        })
        .exec();

      this.logger.log(`Found ${activeVisits.length} visits to evaluate.`);

      for (const visit of activeVisits) {
        // Fetch patient
        const patient = await this.patientModel.findById(visit.patientId).exec();
        if (!patient) continue;

        // Check if patient is currently admitted (bedRequired)
        if (!patient.bedRequired) continue;

        const visitTime = new Date(visit.visitDate).getTime();
        const nowTime = new Date().getTime();

        for (const med of visit.medicines) {
          const days = med.days ?? 1;
          const durationMs = days * 24 * 60 * 60 * 1000;
          
          // Check if today is within the prescription window (from visit date to visit date + days)
          const isWithinWindow = nowTime >= visitTime && nowTime <= (visitTime + durationMs);
          if (!isWithinWindow) continue;

          // Check if medicine has the current session scheduled
          const sessions = med.sessions ?? [];
          if (sessions.includes(currentSession)) {
            // Dispatch in-app notification to the nurse
            this.logger.log(`Dispatching medicine serve reminder to nurse: ${visit.nurseUserId} for patient: ${patient.name}`);
            await this.notificationsService.dispatch(
              NotificationType.PATIENT_MEDICINE_SERVE_REMINDER,
              {
                nurseUserId: visit.nurseUserId ? visit.nurseUserId.toString() : '',
                patientName: patient.name,
                medicineName: med.name,
                quantity: med.quantityPerSession ?? 1,
                session: currentSession,
              },
            );
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error in medicine serve reminders cron: ${err instanceof Error ? err.message : err}`);
    }
  }
}
