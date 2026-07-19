import type { ComponentType, SVGProps } from 'react'

type IllustrationProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IllustrationProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {children}
    </svg>
  )
}

/* Facility Operations */

function HospitalIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <rect x="27" y="22" width="46" height="54" rx="5" className="fill-primary-500 dark:fill-primary-400" />
      <rect x="43" y="36" width="14" height="5" rx="1.5" className="fill-amber-300" />
      <rect x="47.5" y="31.5" width="5" height="14" rx="1.5" className="fill-amber-300" />
      <rect x="35" y="55" width="9" height="9" rx="1.5" className="fill-white/80 dark:fill-slate-900/70" />
      <rect x="56" y="55" width="9" height="9" rx="1.5" className="fill-white/80 dark:fill-slate-900/70" />
      <path
        d="M20 82 L38 77 L50 80 L62 76 L80 82"
        className="stroke-amber-400"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="82" r="3.5" className="fill-amber-400" />
      <circle cx="50" cy="80" r="3.5" className="fill-primary-700 dark:fill-primary-200" />
      <circle cx="80" cy="82" r="3.5" className="fill-amber-400" />
    </Base>
  )
}

function StaffIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <circle cx="50" cy="35" r="14" className="fill-primary-500 dark:fill-primary-400" />
      <path
        d="M26 82c0-15 10.7-24 24-24s24 9 24 24"
        className="fill-primary-500 dark:fill-primary-400"
      />
      <circle cx="70" cy="66" r="13" className="fill-amber-400" />
      <path
        d="M64.5 66.3l3.6 3.8 7-8"
        className="stroke-white dark:stroke-slate-900"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Base>
  )
}

function BedIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <rect x="18" y="60" width="64" height="8" rx="3" className="fill-primary-500 dark:fill-primary-400" />
      <rect x="22" y="68" width="5" height="10" rx="1.5" className="fill-primary-700 dark:fill-primary-300" />
      <rect x="73" y="68" width="5" height="10" rx="1.5" className="fill-primary-700 dark:fill-primary-300" />
      <rect x="22" y="46" width="18" height="14" rx="4" className="fill-amber-300" />
      <rect x="42" y="52" width="36" height="8" rx="3" className="fill-primary-200 dark:fill-primary-900/50" />
      <path
        d="M14 36 L30 36 L35 27 L42 45 L48 32 L53 36 L86 36"
        className="stroke-amber-400"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Base>
  )
}

/* Clinical & Patient Care */

function PatientIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <rect x="22" y="20" width="56" height="60" rx="6" className="fill-primary-500 dark:fill-primary-400" />
      <rect x="30" y="20" width="14" height="10" rx="3" className="fill-primary-700 dark:fill-primary-300" />
      <circle cx="50" cy="44" r="9" className="fill-white/85 dark:fill-slate-900/70" />
      <path
        d="M38 68c1.5-8 6.5-12 12-12s10.5 4 12 12"
        className="fill-white/85 dark:fill-slate-900/70"
      />
      <circle cx="72" cy="64" r="13" className="fill-amber-400" />
      <path
        d="M72 58v12M66 64h12"
        className="stroke-white dark:stroke-slate-900"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </Base>
  )
}

function DiagnosticsIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <path
        d="M42 18h16v20l14 30a10 10 0 01-9 14H37a10 10 0 01-9-14l14-30V18z"
        className="fill-primary-500 dark:fill-primary-400"
      />
      <rect x="38" y="16" width="24" height="7" rx="2.5" className="fill-primary-700 dark:fill-primary-300" />
      <path
        d="M33 60h34l4.5 9.6A9 9 0 0163.4 82H36.6a9 9 0 01-8.1-12.4L33 60z"
        className="fill-amber-300"
      />
      <circle cx="46" cy="70" r="2.6" className="fill-white dark:fill-slate-900" />
      <circle cx="55" cy="74" r="2" className="fill-white dark:fill-slate-900" />
      <circle cx="50" cy="65" r="1.8" className="fill-white dark:fill-slate-900" />
    </Base>
  )
}

/* Supply Chain & AI */

function InventoryIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <path d="M50 16 L82 30 L50 44 L18 30 Z" className="fill-primary-400 dark:fill-primary-300" />
      <path d="M18 30 L50 44 L50 82 L18 68 Z" className="fill-primary-600 dark:fill-primary-500" />
      <path d="M82 30 L50 44 L50 82 L82 68 Z" className="fill-primary-500 dark:fill-primary-400" />
      <circle cx="76" cy="62" r="15" className="fill-amber-400" />
      <path
        d="M69 62h14M76 55v14"
        className="stroke-white dark:stroke-slate-900"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </Base>
  )
}

function AIAnalyticsIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <rect x="20" y="56" width="12" height="24" rx="2.5" className="fill-primary-300 dark:fill-primary-700" />
      <rect x="38" y="42" width="12" height="38" rx="2.5" className="fill-primary-500 dark:fill-primary-400" />
      <rect x="56" y="30" width="12" height="50" rx="2.5" className="fill-primary-600 dark:fill-primary-300" />
      <path
        d="M22 50 L44 34 L62 24"
        className="stroke-amber-400"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 7"
      />
      <path
        d="M74 18l2.6 6.4L83 27l-6.4 2.6L74 36l-2.6-6.4L65 27l6.4-2.6L74 18z"
        className="fill-amber-400"
      />
    </Base>
  )
}

/* Governance & Insights */

function AuthIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <path
        d="M50 16 L78 26 V48 C78 66 66 78 50 84 C34 78 22 66 22 48 V26 Z"
        className="fill-primary-500 dark:fill-primary-400"
      />
      <circle cx="50" cy="46" r="9" className="fill-amber-300" />
      <rect x="46.5" y="52" width="7" height="14" rx="2.5" className="fill-amber-300" />
    </Base>
  )
}

function RBACIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <path
        d="M50 15 L76 24 V44 C76 61 65 72 50 78 C35 72 24 61 24 44 V24 Z"
        className="fill-primary-500 dark:fill-primary-400"
      />
      <circle cx="38" cy="42" r="6.5" className="fill-white/85 dark:fill-slate-900/70" />
      <circle cx="50" cy="36" r="6.5" className="fill-white/85 dark:fill-slate-900/70" />
      <circle cx="62" cy="42" r="6.5" className="fill-white/85 dark:fill-slate-900/70" />
      <path
        d="M32 58c1-5 4-7.5 6-7.5s5 2.5 6 7.5M44 60c1-5 4-7.5 6-7.5s5 2.5 6 7.5M56 58c1-5 4-7.5 6-7.5s5 2.5 6 7.5"
        className="stroke-white/85 dark:stroke-slate-900/70"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="76" cy="66" r="13" className="fill-amber-400" />
      <rect x="70.5" y="64" width="11" height="9" rx="2" className="fill-white dark:fill-slate-900" />
      <path
        d="M72.5 64v-3a3.5 3.5 0 017 0v3"
        className="stroke-white dark:stroke-slate-900"
        strokeWidth="2.4"
        fill="none"
      />
    </Base>
  )
}

function AuditIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <rect x="22" y="16" width="46" height="58" rx="5" className="fill-primary-500 dark:fill-primary-400" />
      <rect x="30" y="27" width="30" height="4.5" rx="2" className="fill-white/80 dark:fill-slate-900/60" />
      <rect x="30" y="37" width="30" height="4.5" rx="2" className="fill-white/80 dark:fill-slate-900/60" />
      <rect x="30" y="47" width="18" height="4.5" rx="2" className="fill-white/80 dark:fill-slate-900/60" />
      <circle cx="68" cy="66" r="15" className="fill-amber-400" />
      <circle cx="65" cy="63" r="6" className="stroke-white dark:stroke-slate-900" strokeWidth="3" fill="none" />
      <path d="M69.5 67.5L76 74" className="stroke-white dark:stroke-slate-900" strokeWidth="3" strokeLinecap="round" />
    </Base>
  )
}

function ReportsIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <rect x="16" y="24" width="68" height="44" rx="5" className="fill-primary-500 dark:fill-primary-400" />
      <rect x="24" y="32" width="52" height="28" rx="2.5" className="fill-white/85 dark:fill-slate-900/70" />
      <rect x="30" y="46" width="7" height="10" rx="1.5" className="fill-primary-400 dark:fill-primary-500" />
      <rect x="40" y="40" width="7" height="16" rx="1.5" className="fill-primary-600 dark:fill-primary-300" />
      <rect x="50" y="36" width="7" height="20" rx="1.5" className="fill-amber-400" />
      <rect x="60" y="43" width="7" height="13" rx="1.5" className="fill-primary-400 dark:fill-primary-500" />
      <rect x="40" y="72" width="20" height="6" rx="3" className="fill-primary-500 dark:fill-primary-400" />
    </Base>
  )
}

function NotificationsIllustration(props: IllustrationProps) {
  return (
    <Base {...props}>
      <path
        d="M50 20c-11 0-18 8-18 20v10L26 62v4h48v-4l-6-12V40c0-12-7-20-18-20z"
        className="fill-primary-500 dark:fill-primary-400"
      />
      <path
        d="M42 70a8 8 0 0016 0"
        className="stroke-primary-500 dark:stroke-primary-400"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="70" cy="30" r="12" className="fill-amber-400" />
      <path d="M70 25v6l4 3" className="stroke-white dark:stroke-slate-900" strokeWidth="2.6" strokeLinecap="round" />
    </Base>
  )
}

export const MODULE_ILLUSTRATIONS: Record<string, ComponentType<IllustrationProps>> = {
  hospitals: HospitalIllustration,
  staff: StaffIllustration,
  beds: BedIllustration,
  patients: PatientIllustration,
  diagnostics: DiagnosticsIllustration,
  inventory: InventoryIllustration,
  'ai-analytics': AIAnalyticsIllustration,
  auth: AuthIllustration,
  rbac: RBACIllustration,
  audit: AuditIllustration,
  reports: ReportsIllustration,
  notifications: NotificationsIllustration,
}
