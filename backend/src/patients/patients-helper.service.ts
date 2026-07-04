import { Injectable } from '@nestjs/common';

@Injectable()
export class PatientsHelperService {
  buildList(entity: string) {
    return {
      data: [
        {
          id: '1',
          name: 'John Doe',
          age: 34,
          bloodGroup: 'O+',
          hospitalId: '1',
        },
        {
          id: '2',
          name: 'Jane Smith',
          age: 28,
          bloodGroup: 'A-',
          hospitalId: '2',
        },
      ],
      entity,
      count: 2,
    };
  }

  buildRecord(entity: string, id: string) {
    return {
      data: {
        id,
        name: 'John Doe',
        age: 34,
        bloodGroup: 'O+',
        hospitalId: '1',
      },
      entity,
    };
  }

  buildCreated(entity: string, data: Record<string, any>) {
    return {
      data: { id: Date.now().toString(), ...data },
      entity,
      created: true,
    };
  }

  buildUpdated(entity: string, id: string, data: Record<string, any>) {
    return { data: { id, ...data }, entity, updated: true };
  }

  buildRemoved(entity: string, id: string) {
    return { id, entity, removed: true };
  }
}
