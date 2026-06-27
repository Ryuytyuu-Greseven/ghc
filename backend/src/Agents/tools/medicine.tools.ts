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

const listMedicines = tool(
  async ({ category }) => {
    const url = category
      ? `${BASE}/medicines/category/${encodeURIComponent(category)}`
      : `${BASE}/medicines`;
    const res = await fetch(url);
    return JSON.stringify(await res.json());
  },
  {
    name: 'list_medicines',
    description: 'List all available medicines; optionally filter by category',
    schema: z.object({
      category: z.string().optional().describe('Category name e.g. Antibiotic, Analgesic, Vitamin'),
    }),
  },
);

const getMedicine = tool(
  async ({ id }) => {
    const res = await fetch(`${BASE}/medicines/${id}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'get_medicine',
    description: 'Get a medicine by its MongoDB ObjectId',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the medicine'),
    }),
  },
);

const createMedicine = tool(
  async (data) => {
    const res = await fetch(`${BASE}/medicines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'create_medicine',
    description: 'Add a new medicine to the inventory',
    schema: z.object({
      name: z.string().describe('Medicine name'),
      dosage: z.string().describe('Dosage strength e.g. 500mg, 10ml'),
      stock: z.number().describe('Initial stock quantity'),
      pricePerUnit: z.number().describe('Price per unit'),
      manufacturer: z.string().optional(),
      category: z.string().optional().describe('e.g. Antibiotic, Analgesic, Vitamin'),
      expiryDate: z.string().optional().describe('Expiry date as YYYY-MM-DD'),
    }),
  },
);

const updateMedicine = tool(
  async ({ id, ...data }) => {
    const res = await fetch(`${BASE}/medicines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'update_medicine',
    description: 'Update medicine information or stock levels',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the medicine'),
      name: z.string().optional(),
      dosage: z.string().optional(),
      stock: z.number().optional(),
      pricePerUnit: z.number().optional(),
      manufacturer: z.string().optional(),
      category: z.string().optional(),
      expiryDate: z.string().optional(),
      isAvailable: z.boolean().optional(),
    }),
  },
);

const deleteMedicine = tool(
  async ({ id }) => {
    const res = await fetch(`${BASE}/medicines/${id}`, { method: 'DELETE' });
    return JSON.stringify(await res.json());
  },
  {
    name: 'delete_medicine',
    description: 'Remove a medicine record permanently',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the medicine'),
    }),
  },
);

export const medicineTools = [
  listMedicines,
  getMedicine,
  createMedicine,
  updateMedicine,
  deleteMedicine,
];
