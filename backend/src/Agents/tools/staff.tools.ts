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

const roleEnum = z.enum(['Doctor', 'Nurse', 'Pharmacist', 'Technician', 'Admin']);

const listStaff = tool(
  async ({ hospitalId, role }) => {
    let url = `${BASE}/staff`;
    if (hospitalId) url = `${BASE}/staff/by-hospital/${hospitalId}`;
    else if (role) url = `${BASE}/staff/by-role/${role}`;
    const res = await fetch(url);
    return JSON.stringify(await res.json());
  },
  {
    name: 'list_staff',
    description: 'List all active staff; optionally filter by hospital ID or role',
    schema: z.object({
      hospitalId: z.string().optional().describe('Filter by hospital MongoDB ObjectId'),
      role: roleEnum.optional().describe('Filter by staff role'),
    }),
  },
);

const getStaffMember = tool(
  async ({ id }) => {
    const res = await fetch(`${BASE}/staff/${id}`);
    return JSON.stringify(await res.json());
  },
  {
    name: 'get_staff_member',
    description: 'Get a staff member by their MongoDB ObjectId',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the staff member'),
    }),
  },
);

const createStaff = tool(
  async (data) => {
    const res = await fetch(`${BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'create_staff',
    description: 'Add a new staff member to the system',
    schema: z.object({
      name: z.string().describe('Full name of the staff member'),
      role: roleEnum.describe('Staff role'),
      department: z.string().describe('Department name'),
      phone: z.string().optional(),
      email: z.string().optional(),
      hospitalId: z.string().optional().describe('Assigned hospital ObjectId'),
    }),
  },
);

const updateStaff = tool(
  async ({ id, ...data }) => {
    const res = await fetch(`${BASE}/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return JSON.stringify(await res.json());
  },
  {
    name: 'update_staff',
    description: 'Update a staff member record',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the staff member'),
      name: z.string().optional(),
      role: roleEnum.optional(),
      department: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      hospitalId: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  },
);

const deleteStaff = tool(
  async ({ id }) => {
    const res = await fetch(`${BASE}/staff/${id}`, { method: 'DELETE' });
    return JSON.stringify(await res.json());
  },
  {
    name: 'delete_staff',
    description: 'Remove a staff member record permanently',
    schema: z.object({
      id: z.string().describe('MongoDB ObjectId of the staff member'),
    }),
  },
);

export const staffTools = [
  listStaff,
  getStaffMember,
  createStaff,
  updateStaff,
  deleteStaff,
];
