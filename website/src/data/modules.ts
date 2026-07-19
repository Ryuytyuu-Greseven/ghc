import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Users,
  BedDouble,
  ClipboardList,
  FlaskConical,
  PackageSearch,
  Sparkles,
  ShieldCheck,
  Lock,
  FileClock,
  FileBarChart,
  BellRing,
} from 'lucide-react'

export interface Module {
  id: string
  icon: LucideIcon
  title: string
  category: string
  tagline: string
  capabilities: string[]
  flow: string
}

export const CATEGORIES = [
  'Facility Operations',
  'Clinical & Patient Care',
  'Supply Chain & AI',
  'Governance & Insights',
] as const

export const MODULES: Module[] = [
  {
    id: 'hospitals',
    icon: Building2,
    title: 'Hospital Management',
    category: 'Facility Operations',
    tagline:
      'Model your entire facility network — from district hospitals down to rural PHCs — as one connected hierarchy.',
    capabilities: [
      'Classify facilities as PHC (Primary Health Centre) or CHC (Community Health Centre) with state/district region codes',
      'Link subordinate PHCs to a parent CHC for hierarchical inventory and reporting roll-ups',
      'Maintain infrastructure checklists: Operating Theatres, X-Ray units, and Ambulances',
    ],
    flow: 'Admins register a parent CHC, then subordinate PHCs reference that parent ID — inventory tracking and district reporting inherit the hierarchy automatically.',
  },
  {
    id: 'staff',
    icon: Users,
    title: 'Staff & Attendance',
    category: 'Facility Operations',
    tagline: "Know who's on duty, where, and since when — without a single paper register.",
    capabilities: [
      'Staff profiles with specialization, medical registration codes, and duty shifts',
      'Daily check-in gateway with fraud-resistant, one-per-day locking',
      'Role-aware duty allocation across facilities',
    ],
    flow: "Staff log in and clock in once per day; the system timestamps and locks the record, so the same day's attendance can't be duplicated or backdated.",
  },
  {
    id: 'beds',
    icon: BedDouble,
    title: 'Bed Management',
    category: 'Facility Operations',
    tagline: 'Live bed counts that update the instant a patient is admitted or discharged.',
    capabilities: [
      'Real-time capacity checks before every admission',
      'Automatic decrement and release on admit and discharge',
      'Full allocation history for audits and capacity planning',
    ],
    flow: 'When a doctor marks "Bed Required" during admission, GHC allocates a bed, updates the facility\'s live count, and logs the event to the bed allocation history.',
  },
  {
    id: 'patients',
    icon: ClipboardList,
    title: 'Patient Management',
    category: 'Clinical & Patient Care',
    tagline: 'Every patient gets a permanent digital health card, no matter which facility they walk into.',
    capabilities: [
      'Onboarding with Aadhaar-format validation and demographic capture',
      'Full medical and visit history attached to a single patient record',
      'Vitals and clinical history available at every facility touchpoint',
    ],
    flow: 'Reception registers a patient once; every subsequent visit — at any hospital in the network — appends to that same medical history.',
  },
  {
    id: 'diagnostics',
    icon: FlaskConical,
    title: 'Diagnostic Tests',
    category: 'Clinical & Patient Care',
    tagline: 'Standardized lab test catalogs so every facility reports diagnostics the same way.',
    capabilities: [
      'Central test list with codes and sample requirements',
      'Lab status tracking from order to result',
      'Consistent reporting format across every facility in the network',
    ],
    flow: 'Doctors order from a standardized test catalog; lab technicians update status as samples move through processing.',
  },
  {
    id: 'inventory',
    icon: PackageSearch,
    title: 'Inventory & Supply Chain',
    category: 'Supply Chain & AI',
    tagline: 'One medicine catalog, tracked from central warehouse down to the last branch shelf.',
    capabilities: [
      'Master catalog with central warehouse and branch batch-level balances',
      'Requisition workflow with approval and dispatch tracking',
      'Full transaction audit trail for every transfer',
    ],
    flow: 'A branch running low submits a transfer request; GHC notifies the central manager by email, and once approved, stock is deducted centrally and dispatched — every step logged.',
  },
  {
    id: 'ai-analytics',
    icon: Sparkles,
    title: 'AI Inventory Analytics',
    category: 'Supply Chain & AI',
    tagline: "The system watches stock levels so nobody finds out about a shortage the hard way.",
    capabilities: [
      'Stockout alarms and demand curve forecasting',
      'Surplus-to-shortage redistribution recommendations between nearby facilities',
      'Optimized medical budget allocation across the network',
    ],
    flow: 'When a branch crosses its threshold, the AI agent flags it, identifies the nearest facility with surplus, and drafts a redistribution request automatically.',
  },
  {
    id: 'auth',
    icon: ShieldCheck,
    title: 'Authentication & SSO',
    category: 'Governance & Insights',
    tagline: 'One login, every module — with recovery built in.',
    capabilities: [
      'Single Sign-On portal with OTP-based account recovery',
      'JWT-based session propagation across all services',
      'Automatic session expiry and scheduled logout',
    ],
    flow: 'Sign in once at the SSO portal; the token carries your identity into the dashboard, backend API, and AI agent without asking again.',
  },
  {
    id: 'rbac',
    icon: Lock,
    title: 'Authorization & RBAC',
    category: 'Governance & Insights',
    tagline: 'Eight roles, enforced at every layer — frontend, API, and even inside the AI agent.',
    capabilities: [
      'Role-based access from Admin down to Compounder / Cashier',
      'Facility-level data isolation — clinics only see their own records',
      'AI tools inherit the same permission checks as the REST API',
    ],
    flow: "A doctor's JWT restricts every query — including ones asked in plain language to the AI agent — to their assigned hospital, blocking cross-facility access before it happens.",
  },
  {
    id: 'audit',
    icon: FileClock,
    title: 'Audit Logs',
    category: 'Governance & Insights',
    tagline: 'An immutable paper trail for every action that matters.',
    capabilities: [
      'Logs authentication failures, data updates, and allocations',
      'Tamper-proof history built for regulatory compliance',
      'Full visibility for district administrators',
    ],
    flow: "Every hospital, staff, patient, and inventory action writes to the audit trail automatically — there's no setting to turn it on.",
  },
  {
    id: 'reports',
    icon: FileBarChart,
    title: 'Reports & Dashboards',
    category: 'Governance & Insights',
    tagline: 'Administrative oversight, visualized — not buried in spreadsheets.',
    capabilities: [
      'SVG charts for visit rates, bed occupancy, and staff ratios',
      'Real-time widgets and alarms on the main dashboard',
      'District-level aggregated analytics',
    ],
    flow: 'Dashboard telemetry pulls directly from live records, so the charts a district administrator sees are never more than a refresh behind reality.',
  },
  {
    id: 'notifications',
    icon: BellRing,
    title: 'Notifications',
    category: 'Governance & Insights',
    tagline: 'The right alert, to the right person, the moment it matters.',
    capabilities: [
      'Transactional email receipts via SMTP layouts',
      'Emergency shortage alerts via Twilio SMS',
      'Automatic dispatch tied to inventory and approval events',
    ],
    flow: "An approved transfer or a critical stockout automatically triggers an email or SMS — no one has to remember to send it.",
  },
]
