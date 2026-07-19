import { Check, Minus, ShieldCheck, KeyRound, EyeOff } from 'lucide-react'
import { ROLES, RBAC_MATRIX } from '../data/rbac'
import Reveal from './Reveal'

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: 'Enforced at every layer',
    description:
      'Sidebar routes, API guards, and AI tools all check the same role and facility scope — not just the UI.',
  },
  {
    icon: EyeOff,
    title: 'Facility-level isolation',
    description:
      'A doctor at one PHC cannot query another facility’s patients, beds, or stock — by role, not by convention.',
  },
  {
    icon: KeyRound,
    title: 'JWT-scoped identity',
    description:
      'Every request carries a signed token binding user, role, and assigned hospital ID through the entire stack.',
  },
]

export default function SecurityRBAC() {
  return (
    <section id="security" className="bg-slate-50 py-24 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
            Security & Access
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            8 roles. Zero ambiguity about who can do what.
          </p>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            GHC ships with a role permission matrix out of the box — not a configuration
            exercise your team has to design from scratch.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 100}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-slate-950/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  <p.icon size={17} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                  {p.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {p.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal
          delay={150}
          className="mt-12 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="sticky left-0 z-10 bg-white p-4 text-left font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">
                  System action
                </th>
                {ROLES.map((role) => (
                  <th
                    key={role}
                    className="whitespace-nowrap p-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400"
                  >
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RBAC_MATRIX.map((row, i) => (
                <tr
                  key={row.action}
                  className={
                    i % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-slate-50/60 dark:bg-slate-800/30'
                  }
                >
                  <td className="sticky left-0 z-10 bg-inherit p-4 font-medium text-slate-700 dark:text-slate-200">
                    {row.action}
                  </td>
                  {row.allowed.map((can, idx) => (
                    <td key={idx} className="p-4 text-center">
                      {can ? (
                        <Check
                          size={16}
                          className="mx-auto text-primary-600 dark:text-primary-400"
                        />
                      ) : (
                        <Minus size={16} className="mx-auto text-slate-300 dark:text-slate-700" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  )
}
