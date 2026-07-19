import { ArrowRight } from 'lucide-react'
import Reveal from './Reveal'

const ROWS = [
  {
    problem: 'Paper-based doctor attendance at rural clinics — no way to verify who is on-duty.',
    solution: 'Daily Check-In Gateway with fraud-resistant, compound-key digital check-ins.',
  },
  {
    problem: 'Medicine stockouts at one clinic while stock expires unused at another.',
    solution: 'AI Supply Redistribution monitors thresholds and suggests transfers from nearby clinics.',
  },
  {
    problem: 'Manual, ambiguous requisitions delay restocking approvals for weeks.',
    solution: 'Autonomous AI-raised requests — the agent audits stock and files central requests itself.',
  },
  {
    problem: 'Patients turned away because doctors can’t see live bed availability.',
    solution: 'Live Bed Tracking decrements capacity in real time as admissions happen.',
  },
  {
    problem: 'Fragmented systems: separate logins, isolated databases, manual reports.',
    solution: 'SSO Federated Architecture propagates one secure identity across every module.',
  },
  {
    problem: 'District administrators have no way to oversee logs, transactions, or trends.',
    solution: 'Audit Trails & Dynamic Reports give real-time visibility into every facility.',
  },
]

export default function ProblemSolution() {
  return (
    <section id="problem" className="bg-slate-50 py-24 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
            Why GHC
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Public healthcare&rsquo;s oldest problems, solved with software that runs itself.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {ROWS.map((row, i) => (
            <Reveal key={row.problem} delay={Math.min(i, 4) * 80}>
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-950/40 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                    The problem
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {row.problem}
                  </p>
                </div>
                <ArrowRight
                  className="hidden shrink-0 text-slate-300 dark:text-slate-700 sm:block"
                  size={20}
                />
                <div className="flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                    How GHC solves it
                  </span>
                  <p className="mt-1 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                    {row.solution}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
