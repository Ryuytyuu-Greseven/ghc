import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000';

const listHospitals = tool(
  async () => {
    const res = await fetch(`${BASE}/hospitals`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'list_hospitals',
    description: 'List all active hospitals',
    schema: z.object({}),
  },
);

const getHospital = tool(
  async ({ id }) => {
    const res = await fetch(`${BASE}/hospitals/${id}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'get_hospital',
    description: 'Get a hospital by its MongoDB ObjectId',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the hospital'),
    }),
  },
);

const createHospital = tool(
  async (data) => {
    const res = await fetch(`${BASE}/hospitals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'create_hospital',
    description: 'Create a new hospital record',
    schema: z.object({
      name: z.string().describe('Hospital name'),
      location: z.string().describe('Hospital location or address'),
      beds: z.number().describe('Total number of beds'),
      phone: z.string().optional().describe('Contact phone number'),
      email: z.string().optional().describe('Contact email address'),
    }),
  },
);

const updateHospital = tool(
  async ({ id, ...data }) => {
    const res = await fetch(`${BASE}/hospitals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'update_hospital',
    description: 'Update fields on an existing hospital record',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the hospital'),
      name: z.string().optional(),
      location: z.string().optional(),
      beds: z.number().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  },
);

const deleteHospital = tool(
  async ({ id }) => {
    const res = await fetch(`${BASE}/hospitals/${id}`, { method: 'DELETE' });
    return JSON.stringify(await res.json());
  },
  {
    name: 'delete_hospital',
    description: 'Permanently delete a hospital record',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the hospital'),
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
