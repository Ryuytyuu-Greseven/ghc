import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { appInstance } from '../../main';
import { HospitalsService } from '../../hospitals/hospitals.service';
import { Hospital } from 'src/schemas/hospital.schema';

function getHospitalsService(): HospitalsService {
  if (!appInstance) {
    throw new Error('NestJS application instance is not initialized');
  }
  return appInstance.get(HospitalsService);
}

const listHospitals = tool(
  async () => {
    const service = getHospitalsService();
    const result = await service.getAllHospitals();
    return JSON.stringify(result);
  },
  {
    name: 'list_hospitals',
    description: 'List all active healthcare facilities (PHCs and CHCs)',
    schema: z.object({}),
  },
);

const getHospital = tool(
  async ({ id }) => {
    const service = getHospitalsService();
    const result = await service.getHospitalById(id);
    return JSON.stringify(result);
  },
  {
    name: 'get_hospital',
    description: 'Get details of a primary (PHC) or community (CHC) healthcare facility by its MongoDB ObjectId',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the facility'),
    }),
  },
);

const createHospital = tool(
  async (data: Partial<Hospital>) => {
    const service = getHospitalsService();
    const result = await service.createHospital(data);
    return JSON.stringify(result);
  },
  {
    name: 'create_hospital',
    description: 'Create a new healthcare facility (PHC or CHC)',
    schema: z.object({
      name: z.string().describe('Name of the facility'),
      type: z.enum(['PHC', 'CHC']).describe('Type of the facility (PHC or CHC)'),
      address: z.string().describe('Street address of the facility'),
      city: z.string().describe('City where facility is located'),
      phone: z.string().optional().describe('Contact phone number'),
      email: z.string().optional().describe('Contact email address'),
      totalBeds: z.number().describe('Total number of beds'),
      availableBeds: z.number().describe('Available number of beds'),
      medicalOfficer: z.string().optional().describe('Name of the Medical Officer in charge'),
      parentCHCId: z.string().optional().describe('MongoDB ObjectId of the parent CHC for a PHC'),
      specialists: z.array(z.string()).optional().describe('Specialist doctors available (for CHC)'),
      hasOT: z.boolean().optional().describe('Whether facility has an Operation Theatre (for CHC)'),
      hasXRay: z.boolean().optional().describe('Whether facility has X-Ray equipment (for CHC)'),
      hasAmbulance: z.boolean().optional().describe('Whether facility has an active ambulance service'),
    }),
  },
);

const updateHospital = tool(
  async ({ id, ...data }: any) => {
    const service = getHospitalsService();
    const result = await service.updateHospital(id, data);
    return JSON.stringify(result);
  },
  {
    name: 'update_hospital',
    description: 'Update fields on an existing healthcare facility record',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the facility to update'),
      name: z.string().optional().describe('Name of the facility'),
      type: z.enum(['PHC', 'CHC']).optional().describe('Type of the facility (PHC or CHC)'),
      address: z.string().optional().describe('Street address of the facility'),
      city: z.string().optional().describe('City where facility is located'),
      phone: z.string().optional().describe('Contact phone number'),
      email: z.string().optional().describe('Contact email address'),
      totalBeds: z.number().optional().describe('Total number of beds'),
      availableBeds: z.number().optional().describe('Available number of beds'),
      medicalOfficer: z.string().optional().describe('Name of the Medical Officer in charge'),
      parentCHCId: z.string().optional().describe('MongoDB ObjectId of the parent CHC for a PHC'),
      specialists: z.array(z.string()).optional().describe('Specialist doctors available (for CHC)'),
      hasOT: z.boolean().optional().describe('Whether facility has an Operation Theatre (for CHC)'),
      hasXRay: z.boolean().optional().describe('Whether facility has X-Ray equipment (for CHC)'),
      hasAmbulance: z.boolean().optional().describe('Whether facility has an active ambulance service'),
      isActive: z.boolean().optional().describe('Whether the facility is currently active'),
    }),
  },
);

const deleteHospital = tool(
  async ({ id }) => {
    const service = getHospitalsService();
    const result = await service.deleteHospital(id);
    return JSON.stringify(result);
  },
  {
    name: 'delete_hospital',
    description: 'Permanently delete a healthcare facility record',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the facility to delete'),
    }),
  },
);

export const hospitalTools = [
  listHospitals,
  getHospital,
  createHospital,
  updateHospital,
  deleteHospital,
];
