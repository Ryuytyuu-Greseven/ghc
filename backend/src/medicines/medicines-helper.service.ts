import { Injectable } from '@nestjs/common';

@Injectable()
export class MedicinesHelperService {
  buildList(entity: string) {
    return {
      data: [
        { id: '1', name: 'Paracetamol', dosage: '500mg', stock: 1000 },
        { id: '2', name: 'Amoxicillin', dosage: '250mg', stock: 500 },
      ],
      entity,
      count: 2,
    };
  }

  buildRecord(entity: string, id: string) {
    return {
      data: { id, name: 'Paracetamol', dosage: '500mg', stock: 1000 },
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
