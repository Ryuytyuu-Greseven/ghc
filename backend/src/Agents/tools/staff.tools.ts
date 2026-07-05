import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { httpClient } from '../../common/services/http.service';
import { AgentState } from '../state';
import { appInstance } from '../../main';
import { StaffService } from '../../staff/staff.service';
import { HospitalsService } from '../../hospitals/hospitals.service';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000';

function getStaffService(): StaffService {
  if (!appInstance) {
    throw new Error('NestJS application instance is not initialized');
  }
  return appInstance.get(StaffService);
}

export { getStaffService };

async function resolveHospitalId(hospitalName: string): Promise<string | undefined> {
  const service = appInstance.get(HospitalsService);
  const res = (await service.getAllHospitals()) as any;
  const branches = Array.isArray(res) ? res : (res?.data ?? []);
  const lowerQuery = hospitalName.toLowerCase();
  for (const branch of branches) {
    const name = branch.name.toLowerCase();
    const normalizedName = name.replace(/[\s-_]+/g, '');
    const normalizedQuery = lowerQuery.replace(/[\s-_]+/g, '');
    if (normalizedQuery.includes(normalizedName)) {
      return branch._id.toString();
    }
  }
  return undefined;
}

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

const roleEnum = z.enum([
  'Doctor',
  'Nurse',
  'Pharmacist',
  'Technician',
  'Admin',
]);

const statusEnum = z.enum(['active', 'inactive', 'all']);

export const listStaff = tool(
  async ({ hospitalId, hospitalName, role, status, name }) => {
    let resolvedHospitalId = hospitalId;
    if (!resolvedHospitalId && hospitalName) {
      resolvedHospitalId = await resolveHospitalId(hospitalName);
    }

    const service = getStaffService();
    const staffList = await service.findFiltered({
      hospitalId: resolvedHospitalId,
      role,
      status: status ?? 'active',
      name,
    });
    return JSON.stringify({ count: staffList.length, status: status ?? 'active', staffList });
  },
  {
    name: 'list_staff',
    description:
      'List hospital staff with filters. ALWAYS pass name when the user asks for a specific person (e.g. "find Raghu", "show Peter"). Pass both name and role for queries like "Peter doctor". Pass role only for role-wide lists. Use status for active/inactive/all.',
    schema: z.object({
      status: statusEnum
        .optional()
        .describe(
          'Staff employment status: active (default), inactive (deactivated/former), or all (both)',
        ),
      hospitalId: z
        .string()
        .optional()
        .describe('Filter by hospital MongoDB ObjectId'),
      hospitalName: z
        .string()
        .optional()
        .describe('Hospital or branch name mentioned in the user query'),
      role: roleEnum
        .optional()
        .describe(
          'Filter by staff role — required when user mentions Doctor, Nurse, etc. in a targeted query',
        ),
      name: z
        .string()
        .optional()
        .describe(
          'Staff name or partial name — REQUIRED when user asks to find/show/get a specific person by name',
        ),
    }),
  },
);

export const staffListingTools = [listStaff];

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

export const findAbsenceStaff = tool(
  () => {
    // call the function to find the absence staff members
    // update to state
    // state.staffAbsence = [...staffAbsence];
    return JSON.stringify({ message: 'Found Few Staff Members Absent' });
  },
  {
    name: 'find_absence_staff',
    description: 'Find staff members who are absent',
    schema: z.object({
      hospitalId: z.string().describe('MongoDB ObjectId of the hospital'),
    }),
  },
);

export const findAvailableStaff = tool(
  () => {
    // call the function to find the available staff members
    // update to state
    // state.staffAvailable = [...staffAvailable];
    return JSON.stringify({ message: 'Found Few Staff Members Available' });
  },
  {
    name: 'find_available_staff',
    description: 'Find staff members who are available',
    schema: z.object({
      hospitalId: z.string().describe('MongoDB ObjectId of the hospital'),
    }),
  },
);

export const mapStaff = tool(
  (state: typeof AgentState.State) => {
    // map the staff members to the available staff members
    // state.mappedStaff = [...mappedStaff];
    return JSON.stringify({ message: 'Mapped Staff Members' });
  },
  {
    name: 'map_staff',
    description: 'Map staff members to the hospital',
    schema: z.object({
      hospitalId: z.string().describe('MongoDB ObjectId of the hospital'),
    }),
  },
);

export const runTransfer = tool(
  () => {
    // call the function to run the transfer
    // update in db
    // clear the state variables
    return JSON.stringify({ message: 'Transfer Completed' });
  },
  {
    name: 'run_transfer',
    description: 'Run the transfer of staff members',
    schema: z.object({
      hospitalId: z.string().describe('MongoDB ObjectId of the hospital'),
    }),
  },
);
