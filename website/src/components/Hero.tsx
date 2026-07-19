import { ArrowRight, PlayCircle, Trophy } from 'lucide-react'

const STATS = [
  { value: '8', label: 'Role-aware access levels' },
  { value: '7', label: 'Languages supported' },
  { value: '3', label: 'Facility tiers unified (PHC / CHC / District)' },
  { value: '24/7', label: 'Real-time bed & inventory sync' },
]

interface HeroProps {
  onWatchDemo: () => void
}

export default function Hero({ onWatchDemo }: HeroProps) {
  return (
    <section id="top" className="relative overflow-hidden bg-white dark:bg-slate-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] dark:opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(148 163 184 / 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.15) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(20,184,166,0.12) 0%, rgba(20,184,166,0) 70%)',
        }}
      />
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 text-center lg:px-8 lg:pt-24">
        <div className="animate-fade-up [animation-fill-mode:both]">
          <a
            href="#recognition"
            className="relative mx-auto flex w-fit max-w-[90vw] animate-glow-pulse items-center gap-2.5 overflow-hidden rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 py-1.5 pl-1.5 pr-4 transition-transform duration-300 hover:scale-[1.03] dark:border-amber-700/50 dark:from-amber-900/30 dark:via-orange-950/30 dark:to-amber-900/30"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
              <Trophy size={12} strokeWidth={2.25} />
            </span>
            <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
              <span className="font-bold">Top 2</span>
              <span className="mx-1.5 text-amber-400 dark:text-amber-600">•</span>
              Google Cloud's Build with AI: Code for Communities, in partnership with the
              Central Government of India
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/25"
            />
          </a>
        </div>

        <h1
          className="mx-auto mt-6 max-w-4xl animate-fade-up text-4xl font-bold tracking-tight text-slate-900 [animation-delay:100ms] [animation-fill-mode:both] dark:text-white sm:text-5xl lg:text-6xl"
        >
          Run your entire hospital network from one platform.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg leading-relaxed text-slate-600 [animation-delay:200ms] [animation-fill-mode:both] dark:text-slate-300">
          GHC unifies patient admissions, bed allocations, staff attendance, and medicine
          supply chains across Primary Health Centres, Community Health Centres, and District
          Hospitals — with an AI agent doing the busywork.
        </p>

        <div className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-4 [animation-delay:300ms] [animation-fill-mode:both] sm:flex-row">
          <button
            type="button"
            onClick={onWatchDemo}
            className="group inline-flex items-center gap-2 rounded-full bg-primary-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/30"
          >
            <PlayCircle size={20} className="transition-transform duration-300 group-hover:scale-110" />
            Watch Demo
          </button>
          <a
            href="#features"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-300 px-7 py-3.5 text-base font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-400 hover:text-primary-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-primary-500 dark:hover:text-primary-400"
          >
            Explore the Platform
            <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>

        <dl className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="animate-fade-up transition-transform duration-300 hover:-translate-y-1 [animation-fill-mode:both]"
              style={{ animationDelay: `${400 + i * 80}ms` }}
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {stat.value}
              </dd>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
