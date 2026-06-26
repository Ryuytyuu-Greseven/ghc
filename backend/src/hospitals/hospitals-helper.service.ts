import { Injectable } from '@nestjs/common';

@Injectable()
export class HospitalsHelperService {
  buildList(entity: string) {
    return {
      data: [
        { id: '1', name: 'City General Hospital', location: 'New York', beds: 500 },
        { id: '2', name: 'Sunrise Medical Center', location: 'Los Angeles', beds: 300 },
      ],
      entity,
      count: 2,
    };
  }

  buildRecord(entity: string, id: string) {
    return {
      data: { id, name: 'City General Hospital', location: 'New York', beds: 500 },
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
