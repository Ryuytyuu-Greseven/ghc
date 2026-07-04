import { HumanMessage, SystemMessage } from 'langchain';
import type { BaseMessage } from '@langchain/core/messages';
import { HospitalsService } from '../../hospitals/hospitals.service';
import { appInstance } from '../../main';
import { llmInstance } from '../../google/vertex.config';

export async function llmClassify(
  query: string,
  options: string[],
  systemInstruction: string,
): Promise<string> {
  const response = await llmInstance.invoke(
    [new SystemMessage(systemInstruction), new HumanMessage(query)],
    {
      tags: ['classification'],
      metadata: { is_classification: true },
    },
  );
  console.log('response', response);
  const raw = (response.content as string)
    .trim()
    .toLowerCase()
    .split(/[\s,]+/)[0];
  return options.includes(raw) ? raw : options[options.length - 1];
}

export function resolveUserQuery(
  state: { transcript?: string; messages: BaseMessage[] },
  fallback: string,
): string {
  if (state.transcript?.trim()) return state.transcript.trim();

  for (let i = state.messages.length - 1; i >= 0; i--) {
    const message = state.messages[i];
    if (message.getType() !== 'human') continue;
    if (typeof message.content === 'string' && message.content.trim()) {
      return message.content.trim();
    }
  }

  return fallback;
}

export function latestHumanMessages(
  messages: BaseMessage[],
  query: string,
): BaseMessage[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.getType() === 'human') return [message];
  }
  return [new HumanMessage(query)];
}

export async function extractBranchId(
  query: string,
): Promise<string | undefined> {
  try {
    const service = appInstance.get(HospitalsService);
    const res = (await service.getAllHospitals()) as any;
    const branches = Array.isArray(res) ? res : (res?.data ?? []);
    const lowerQuery = query.toLowerCase();
    for (const branch of branches) {
      const name = branch.name.toLowerCase();
      const normalizedName = name.replace(/[\s-_]+/g, '');
      const normalizedQuery = lowerQuery.replace(/[\s-_]+/g, '');
      if (normalizedQuery.includes(normalizedName)) {
        return branch._id.toString();
      }
    }
  } catch {}
  return undefined;
}

const STATIC_CATEGORIES = [
  'Medicine',
  'Equipment',
  'Consumable',
  'Surgical',
  'Diagnostic',
  'Other',
];

export function extractCategory(query: string): string | undefined {
  const lower = query.toLowerCase();

  // Direct matches with static categories (singular/plural variations)
  for (const cat of STATIC_CATEGORIES) {
    const catLower = cat.toLowerCase();
    if (
      lower.includes(catLower) ||
      (catLower.endsWith('s') && lower.includes(catLower.slice(0, -1))) ||
      (!catLower.endsWith('s') && lower.includes(catLower + 's'))
    ) {
      return cat;
    }
  }

  return undefined;
}

export async function extractSearchQuery(
  query: string,
): Promise<string | undefined> {
  let clean = query.replace(/\b(in|at)\s+.*$/gi, ''); // remove branch specifiers first!
  try {
    const service = appInstance.get(HospitalsService);
    const res = (await service.getAllHospitals()) as any;
    const branches = Array.isArray(res) ? res : (res?.data ?? []);
    for (const branch of branches) {
      const nameRegex = new RegExp(`\\b${branch.name}\\b`, 'gi');
      clean = clean.replace(nameRegex, '');
    }
  } catch {}
  clean = clean.replace(
    /\b(show|list|how|many|do|we|have|is|are|left|stock|available|of|in|at|what|which|items|item|any|quantity|quantities|availability|inventory|store|central)\b/gi,
    '',
  );
  clean = clean.trim().replace(/[?.]/g, '').replace(/\s+/g, ' ');

  if (clean.length >= 2) {
    // Check if the query is just a category name (plural or singular)
    const lowerClean = clean.toLowerCase();
    const isCategory = STATIC_CATEGORIES.some((cat) => {
      const catLower = cat.toLowerCase();
      return (
        lowerClean === catLower ||
        lowerClean === catLower + 's' ||
        (catLower.endsWith('s') && lowerClean === catLower.slice(0, -1)) ||
        (!catLower.endsWith('s') && catLower + 's' === lowerClean)
      );
    });
    if (isCategory) {
      return undefined;
    }
    return clean;
  }
  return undefined;
}

// Helper to extract status from query (Pending, Approved, Rejected, Partial)
export function extractRequestStatus(query: string): string | undefined {
  const lower = query.toLowerCase();
  if (lower.includes('pending')) return 'Pending';
  if (lower.includes('approved')) return 'Approved';
  if (lower.includes('rejected')) return 'Rejected';
  if (lower.includes('partial')) return 'Partial';
  return undefined;
}
