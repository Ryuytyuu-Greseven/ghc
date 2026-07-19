import { Trophy, Landmark } from 'lucide-react'
import Reveal from './Reveal'

const AWARDS = [
  {
    icon: Trophy,
    badge: 'Top 2',
    title: "Google Cloud's Build with AI: Code for Communities",
    description:
      'Recognized as a top 2 finalist for applying Google Cloud Vertex AI to solve real public healthcare operations challenges — bed shortages, stockouts, and fragmented facility data.',
  },
  {
    icon: Landmark,
    badge: 'Top 2',
    title: 'Central Government Recognition',
    description:
      "GHC's approach to unifying public healthcare administration was recognized in the top 2 by the Central Government for its potential impact on citizen health services.",
  },
]

export default function Awards() {
  return (
    <section id="recognition" className="bg-slate-50 py-24 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Recognition
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Validated outside our own team, twice over.
          </p>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            GHC's approach to public healthcare hasn't just been our own claim — it's been
            independently recognized.
          </p>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
          {AWARDS.map((award, i) => (
            <Reveal key={award.title} delay={i * 120}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-b from-amber-50/80 to-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-amber-500/10 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-slate-900">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl transition-opacity duration-300 group-hover:opacity-80 dark:bg-amber-500/10"
                />

                <div className="relative flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30">
                    <award.icon size={22} />
                  </div>
                  <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                    {award.badge}
                  </span>
                </div>

                <h3 className="relative mt-5 text-lg font-bold text-slate-900 dark:text-white">
                  {award.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {award.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
