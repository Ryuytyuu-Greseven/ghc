import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { appInstance } from '../../main';
import { PatientsService } from '../../patients/patients.service';

export type TimePeriod = 'morning' | 'afternoon' | 'evening';

const TIME_PERIODS: Record<TimePeriod, { startHour: number; endHour: number; endMinute: number }> = {
  morning: { startHour: 6, endHour: 11, endMinute: 59 },
  afternoon: { startHour: 12, endHour: 16, endMinute: 59 },
  evening: { startHour: 17, endHour: 20, endMinute: 59 },
};

function getPatientsService(): PatientsService {
  if (!appInstance) {
    throw new Error('NestJS application instance is not initialized');
  }
  return appInstance.get(PatientsService);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getTodayStart(): Date {
  return startOfDay(new Date());
}

export function getYesterdayStart(): Date {
  const d = getTodayStart();
  d.setDate(d.getDate() - 1);
  return d;
}

export function parseDateString(dateStr: string): Date | null {
  const iso = Date.parse(dateStr);
  if (!Number.isNaN(iso)) return startOfDay(new Date(iso));

  const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return startOfDay(new Date(Number(year), Number(month) - 1, Number(day)));
  }

  const yyyymmdd = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    return startOfDay(new Date(Number(year), Number(month) - 1, Number(day)));
  }

  return null;
}

export function parseSpecificTime(timeStr: string): { hours: number; minutes: number } | null {
  const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3].toLowerCase();

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  return { hours, minutes };
}

export function getTimeRangeForPeriod(day: Date, period: TimePeriod): { from: Date; to: Date } {
  const config = TIME_PERIODS[period];
  const from = new Date(day);
  from.setHours(config.startHour, 0, 0, 0);
  const to = new Date(day);
  to.setHours(config.endHour, config.endMinute, 59, 999);
  return { from, to };
}

export function getTimeRangeForSpecificTime(day: Date, timeStr: string): { from: Date; to: Date } | null {
  const parsed = parseSpecificTime(timeStr);
  if (!parsed) return null;

  const from = new Date(day);
  from.setHours(parsed.hours, Math.max(0, parsed.minutes - 15), 0, 0);
  const to = new Date(day);
  to.setHours(parsed.hours, Math.min(59, parsed.minutes + 15), 59, 999);
  return { from, to };
}

async function fetchDischarged(options: {
  from: Date;
  to: Date;
  hospitalId?: string;
  label: string;
}) {
  const service = getPatientsService();
  const patients = await service.findDischarged({
    from: options.from,
    to: options.to,
    hospitalId: options.hospitalId,
  });
  return JSON.stringify({
    label: options.label,
    count: patients.length,
    from: options.from.toISOString(),
    to: options.to.toISOString(),
    patients: patients.map((p) => ({
      name: p.name,
      age: p.age,
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      admittedAt: p.admittedAt,
      dischargedAt: p.dischargedAt,
      hospitalName: (p.hospitalId as any)?.name,
    })),
  });
}

export const listDischargedToday = tool(
  async ({ hospitalId }) => {
    const from = getTodayStart();
    const to = endOfDay(from);
    return fetchDischarged({ from, to, hospitalId, label: 'today' });
  },
  {
    name: 'list_discharged_today',
    description:
      'List all patients discharged today (current calendar day). Use when the doctor asks about discharges today or this morning/afternoon/evening without a specific past date.',
    schema: z.object({
      hospitalId: z.string().optional().describe('Optional hospital MongoDB ObjectId to scope results'),
    }),
  },
);

export const listDischargedYesterday = tool(
  async ({ hospitalId }) => {
    const from = getYesterdayStart();
    const to = endOfDay(from);
    return fetchDischarged({ from, to, hospitalId, label: 'yesterday' });
  },
  {
    name: 'list_discharged_yesterday',
    description:
      'List all patients discharged yesterday (previous calendar day). Use when the doctor asks about yesterday\'s discharges.',
    schema: z.object({
      hospitalId: z.string().optional().describe('Optional hospital MongoDB ObjectId to scope results'),
    }),
  },
);

export const listDischargedByDate = tool(
  async ({ date, hospitalId }) => {
    const day = parseDateString(date);
    if (!day) {
      return JSON.stringify({ error: `Could not parse date: ${date}. Use YYYY-MM-DD or DD/MM/YYYY.` });
    }
    const from = startOfDay(day);
    const to = endOfDay(day);
    return fetchDischarged({ from, to, hospitalId, label: date });
  },
  {
    name: 'list_discharged_by_date',
    description:
      'List all patients discharged on a specific calendar date provided by the doctor (e.g. 2026-03-15 or 15/03/2026). Use for any explicit date that is not today or yesterday.',
    schema: z.object({
      date: z.string().describe('The discharge date in YYYY-MM-DD or DD/MM/YYYY format'),
      hospitalId: z.string().optional().describe('Optional hospital MongoDB ObjectId to scope results'),
    }),
  },
);

export const listDischargedByTimePeriod = tool(
  async ({ date, timePeriod, hospitalId }) => {
    const day = date ? parseDateString(date) : getTodayStart();
    if (!day) {
      return JSON.stringify({ error: `Could not parse date: ${date}` });
    }

    const range = getTimeRangeForPeriod(day, timePeriod);
    return fetchDischarged({
      from: range.from,
      to: range.to,
      hospitalId,
      label: `${date || 'today'} ${timePeriod}`,
    });
  },
  {
    name: 'list_discharged_by_time_period',
    description:
      'List patients discharged during a time-of-day window: morning (6 AM–11:59 AM), afternoon (12 PM–4:59 PM), or evening (5 PM–8:59 PM). Defaults to today if no date is given.',
    schema: z.object({
      timePeriod: z
        .enum(['morning', 'afternoon', 'evening'])
        .describe('Time-of-day window: morning, afternoon, or evening'),
      date: z
        .string()
        .optional()
        .describe('Optional date (YYYY-MM-DD or DD/MM/YYYY). Defaults to today.'),
      hospitalId: z.string().optional().describe('Optional hospital MongoDB ObjectId to scope results'),
    }),
  },
);

export const listDischargedBySpecificTime = tool(
  async ({ time, date, hospitalId }) => {
    const day = date ? parseDateString(date) : getTodayStart();
    if (!day) {
      return JSON.stringify({ error: `Could not parse date: ${date}` });
    }

    const range = getTimeRangeForSpecificTime(day, time);
    if (!range) {
      return JSON.stringify({
        error: `Could not parse time: ${time}. Use formats like "10:30 AM" or "3 PM".`,
      });
    }

    return fetchDischarged({
      from: range.from,
      to: range.to,
      hospitalId,
      label: `${date || 'today'} at ${time}`,
    });
  },
  {
    name: 'list_discharged_by_specific_time',
    description:
      'List patients discharged around a specific clock time (±15 minutes), e.g. "10:30 AM" or "3 PM". Defaults to today if no date is given.',
    schema: z.object({
      time: z.string().describe('Specific time like "10:30 AM", "3 PM", or "14:00"'),
      date: z
        .string()
        .optional()
        .describe('Optional date (YYYY-MM-DD or DD/MM/YYYY). Defaults to today.'),
      hospitalId: z.string().optional().describe('Optional hospital MongoDB ObjectId to scope results'),
    }),
  },
);

export const patientDischargeTools = [
  listDischargedToday,
  listDischargedYesterday,
  listDischargedByDate,
  listDischargedByTimePeriod,
  listDischargedBySpecificTime,
];
