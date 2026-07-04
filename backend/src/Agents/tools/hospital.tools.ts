import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { appInstance } from '../../main';
import { HospitalsService } from '../../hospitals/hospitals.service';
import { HospitalDocument } from 'src/schemas/hospital.schema';
import { HospitalHelperService } from '../services/hospital-helper.service';

function getHospitalsService(): HospitalsService {
  if (!appInstance) {
    throw new Error('NestJS application instance is not initialized');
  }
  return appInstance.get(HospitalsService);
}

export const listHospitals = tool(
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

export const getHospital = tool(
  async ({ id }) => {
    const service = getHospitalsService();
    const result = await service.getHospitalById(id);
    return JSON.stringify(result);
  },
  {
    name: 'get_hospital',
    description:
      'Get details of a primary (PHC) or community (CHC) healthcare facility by its MongoDB ObjectId',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the facility'),
    }),
  },
);

export const fetchHospitalByName = tool(
  async ({ name }) => {
    console.log('Fetch Hospital By Name', name);
    const service = getHospitalsService();
    const res: any = await service.getAllHospitals({});
    console.log('Fetch Hospital By Name Response', res);
    let data = res.data || res;
    if (name && Array.isArray(data)) {
      data = data.filter((hospital: HospitalDocument) =>
        hospital.name.toLowerCase().includes(name.toLowerCase()),
      );
    }
    console.log('Filtered Hospital Response', data);
    return JSON.stringify(data);
  },
  {
    name: 'fetchHospitals',
    description:
      'This tool can be used to fetch all hospitals and their details. You can use this tool to search for a hospital by name. Name of the hospital to search for is optional',
    schema: z.object({
      name: z
        .string()
        .optional()
        .describe('Name of the hospital to search for'),
    }),
  },
);

export const fetchBedsAvailability = tool(
  async ({ name }) => {
    console.log('Fetch Beds Availability', name);
    const service = getHospitalsService();
    const res: any = await service.getAllHospitals({});
    let data = res.data || res;
    if (name && Array.isArray(data)) {
      data = data.filter((hospital: HospitalDocument) =>
        hospital.name.toLowerCase().includes(name.toLowerCase()),
      );
    }
    if (Array.isArray(data)) {
      return JSON.stringify(
        data.map((h: any) => ({
          id: h._id,
          name: h.name,
          totalBeds: h.totalBeds,
          availableBeds: h.availableBeds,
        })),
      );
    }
    return JSON.stringify({ error: 'No hospitals found' });
  },
  {
    name: 'fetchBedsAvailability',
    description:
      'Fetch total and available beds for hospitals, optionally filtering by hospital name',
    schema: z.object({
      name: z
        .string()
        .optional()
        .describe('Name of the hospital to search for'),
    }),
  },
);

export const fetchMedicalInchargeDetails = tool(
  async ({ name }) => {
    console.log('Fetch Medical Incharge Details', name);
    const service = getHospitalsService();
    const res: any = await service.getAllHospitals({});
    let data = res.data || res;
    if (name && Array.isArray(data)) {
      data = data.filter((hospital: HospitalDocument) =>
        hospital.name.toLowerCase().includes(name.toLowerCase()),
      );
    }
    if (Array.isArray(data)) {
      return JSON.stringify(
        data.map((h: any) => ({
          id: h._id,
          name: h.name,
          medicalOfficer: h.medicalOfficer || 'No Medical Officer assigned',
          phone: h.phone,
          email: h.email,
        })),
      );
    }
    return JSON.stringify({ error: 'No hospitals found' });
  },
  {
    name: 'fetchMedicalInchargeDetails',
    description:
      'Fetch medical officer incharge details for hospitals, optionally filtering by hospital name',
    schema: z.object({
      name: z
        .string()
        .optional()
        .describe('Name of the hospital to search for'),
    }),
  },
);

export const fetchPatientsDetails = tool(
  async ({ name }) => {
    console.log('Fetch Patients Details', name);
    const service = getHospitalsService();
    const res: any = await service.getAllHospitals({});
    let data = res.data || res;
    if (name && Array.isArray(data)) {
      data = data.filter((hospital: HospitalDocument) =>
        hospital.name.toLowerCase().includes(name.toLowerCase()),
      );
    }
    if (Array.isArray(data)) {
      const result: any[] = [];
      for (const h of data) {
        const hospitalLogicalId = h.hospitalId || h._id.toString();
        const patients =
          await HospitalHelperService.findPatientsByHospital(hospitalLogicalId);
        result.push({
          hospitalId: h._id,
          hospitalName: h.name,
          patients: patients.map((p: any) => ({
            id: p._id,
            name: p.name,
            age: p.age,
            gender: p.gender,
            condition: p.condition || p.diagnosis,
            status: p.status,
          })),
        });
      }
      return JSON.stringify(result);
    }
    return JSON.stringify({ error: 'No hospitals found' });
  },
  {
    name: 'fetchPatientsDetails',
    description: 'Fetch patient list/details for a specific hospital by name',
    schema: z.object({
      name: z.string().describe('Name of the hospital to fetch patients from'),
    }),
  },
);

export const fetchStaffDetails = tool(
  async ({ name }) => {
    console.log('Fetch Staff Details', name);
    const service = getHospitalsService();
    const res: any = await service.getAllHospitals({});
    let data = res.data || res;
    if (name && Array.isArray(data)) {
      data = data.filter((hospital: HospitalDocument) =>
        hospital.name.toLowerCase().includes(name.toLowerCase()),
      );
    }
    if (Array.isArray(data)) {
      const result: any[] = [];
      for (const h of data) {
        const hospitalLogicalId = h.hospitalId || h._id.toString();
        const staff =
          await HospitalHelperService.findStaffByHospital(hospitalLogicalId);
        result.push({
          hospitalId: h._id,
          hospitalName: h.name,
          staff: staff.map((s: any) => ({
            id: s._id,
            name: s.displayName || `${s.firstName} ${s.lastName || ''}`.trim(),
            role: s.role,
            specialization: s.specialization,
            phone: s.mobileNumber,
          })),
        });
      }
      return JSON.stringify(result);
    }
    return JSON.stringify({ error: 'No hospitals found' });
  },
  {
    name: 'fetchStaffDetails',
    description: 'Fetch staff list/details for a specific hospital by name',
    schema: z.object({
      name: z.string().describe('Name of the hospital to fetch staff from'),
    }),
  },
);

export const fetchAvailableSpecialists = tool(
  async ({ name }) => {
    console.log('Fetch Available Specialists', name);
    const service = getHospitalsService();
    const res: any = await service.getAllHospitals({});
    let data = res.data || res;
    if (name && Array.isArray(data)) {
      data = data.filter((hospital: HospitalDocument) =>
        hospital.name.toLowerCase().includes(name.toLowerCase()),
      );
    }
    if (Array.isArray(data)) {
      return JSON.stringify(
        data.map((h: any) => ({
          id: h._id,
          name: h.name,
          specialists: h.specialists || [],
        })),
      );
    }
    return JSON.stringify({ error: 'No hospitals found' });
  },
  {
    name: 'fetchAvailableSpecialists',
    description:
      'Fetch lists of available specialists (e.g. surgeon, pediatrician) in hospitals, optionally filtering by hospital name',
    schema: z.object({
      name: z.string().optional().describe('Name of the hospital to filter by'),
    }),
  },
);

export const hospitalTools = [
  listHospitals,
  getHospital,
  fetchHospitalByName,
  fetchBedsAvailability,
  fetchMedicalInchargeDetails,
  fetchPatientsDetails,
  fetchStaffDetails,
  fetchAvailableSpecialists,
];
