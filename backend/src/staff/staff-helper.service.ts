import { Injectable } from '@nestjs/common';

@Injectable()
export class StaffHelperService {
  buildList(entity: string) {
    return {
      data: [
        { id: '1', name: 'Dr. Emily Clarke', role: 'Doctor', department: 'Cardiology', hospitalId: '1' },
        { id: '2', name: 'Nurse Robert Kim', role: 'Nurse', department: 'ICU', hospitalId: '1' },
      ],
      entity,
      count: 2,
    };
  }

  buildRecord(entity: string, id: string) {
    return {
      data: { id, name: 'Dr. Emily Clarke', role: 'Doctor', department: 'Cardiology', hospitalId: '1' },
      entity,
    };
  }

  buildCreated(entity: string, data: Record<string, any>) {
    return { data: { id: Date.now().toString(), ...data }, entity, created: true };
  }

  buildUpdated(entity: string, id: string, data: Record<string, any>) {
    return { data: { id, ...data }, entity, updated: true };
  }

  buildRemoved(entity: string, id: string) {
    return { id, entity, removed: true };
  }
}
