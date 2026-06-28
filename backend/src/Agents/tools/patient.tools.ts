import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { httpClient } from '../../common/services/http.service';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000';

async function fetch(url: string, init?: any) {
  const path = url.startsWith(BASE) ? url.substring(BASE.length) : url;
  const method = init?.method ?? 'GET';
  const headers = init?.headers;
  const data = init?.body ? JSON.parse(init.body) : undefined;

  const res = await httpClient.request({
    url: path,
    method,
    headers,
    data,
  });

  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    json: async () => res.data,
  };
}

const bloodGroupEnum = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

const listPatients = tool(
  async ({ hospitalId }) => {
    const url = hospitalId
      ? `${BASE}/patients/by-hospital/${hospitalId}`
      : `${BASE}/patients`;
    const res = await fetch(url);
    return JSON.stringify(await res.json());
  },
  {
    name: 'list_patients',
    description: 'List all active patients; optionally filter by hospital ID',
    schema: z.object({
      hospitalId: z.string().optional().describe('Filter by hospital MongoDB ObjectId'),
    }),
  },
);

const getPatient = tool(
  async ({ id }) => {
    const res = await fetch(`${BASE}/patients/${id}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'get_patient',
    description: 'Get a patient by their MongoDB ObjectId',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the patient'),
    }),
  },
);

// const getPatientByName = tool(
//   async ({ id }) => {
//     const res = await fetch(`${BASE}/patients/by-name/${name}`);
//     return JSON.stringify(await res.json());
//   },
//   {
//     name: 'get_patient',
//     description: 'Get a patient by their MongoDB ObjectId',
//     schema: z.object({
//       id: z.string().describe('MongoDB ObjectId of the patient'),
//     }),
//   },
// );

const createPatient = tool(
  async (data) => {
    const res = await fetch(`${BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'create_patient',
    description: 'Register a new patient record',
    schema: z.object({
      name: z.string().describe('Patient full name'),
      age: z.number().describe('Age in years'),
      bloodGroup: bloodGroupEnum.describe('Blood group (e.g. A+, O-)'),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      hospitalId: z.string().optional().describe('Assigned hospital ObjectId'),
    }),
  },
);

const updatePatient = tool(
  async ({ id, ...data }) => {
    const res = await fetch(`${BASE}/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'update_patient',
    description: 'Update fields on an existing patient record',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the patient'),
      name: z.string().optional(),
      age: z.number().optional(),
      bloodGroup: bloodGroupEnum.optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      hospitalId: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  },
);

export const patientTools = [
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
];
