import { useState } from 'react'
import { CheckCircle2, Workflow } from 'lucide-react'
import { CATEGORIES, MODULES } from '../data/modules'
import { MODULE_ILLUSTRATIONS } from '../illustrations/ModuleIllustrations'
import Reveal from './Reveal'

export default function ModuleExplorer() {
  const [activeId, setActiveId] = useState(MODULES[0].id)
  const active = MODULES.find((m) => m.id === activeId)!
  const Illustration = MODULE_ILLUSTRATIONS[active.id]

  return (
    <section id="features" className="bg-white py-24 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
            The Platform
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Twelve modules. One operational record of truth.
          </p>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Built on NestJS and React, backed by MongoDB — modular enough to roll out one
            facility at a time, or the whole district at once. Pick a module to see how it
            actually works.
          </p>
        </Reveal>

        {/* Mobile: flat scrollable pill list */}
        <div className="mt-10 -mx-6 flex gap-2 overflow-x-auto px-6 pb-2 lg:hidden">
          {MODULES.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveId(mod.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ${
                mod.id === activeId
                  ? 'scale-105 border-primary-600 bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                  : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary-700'
              }`}
            >
              <mod.icon size={15} />
              {mod.title}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-8 lg:mt-12 lg:grid-cols-[300px_1fr] lg:gap-10">
          {/* Desktop: categorized sidebar */}
          <nav className="hidden lg:block">
            <div className="sticky top-24 space-y-7">
              {CATEGORIES.map((category) => (
                <div key={category}>
                  <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {category}
                  </p>
                  <div className="mt-2 space-y-1">
                    {MODULES.filter((m) => m.category === category).map((mod) => (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => setActiveId(mod.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-200 ${
                          mod.id === activeId
                            ? 'translate-x-1 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                            : 'text-slate-600 hover:translate-x-0.5 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <mod.icon size={16} className="shrink-0" />
                        <span className="truncate">{mod.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Detail panel */}
          <div
            key={active.id}
            className="animate-fade-up rounded-3xl border border-slate-200 bg-slate-50/60 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-800/30 sm:p-10"
          >
            <div className="flex animate-fade-up items-center gap-5 [animation-delay:60ms] [animation-fill-mode:both]">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-50 to-amber-50 p-3 shadow-sm dark:from-primary-900/30 dark:to-amber-900/10 sm:h-24 sm:w-24 sm:p-3.5">
                <Illustration className="h-full w-full" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                  {active.category}
                </span>
                <h3 className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white">
                  {active.title}
                </h3>
              </div>
            </div>

            <p className="mt-5 animate-fade-up text-lg leading-relaxed text-slate-700 [animation-delay:120ms] [animation-fill-mode:both] dark:text-slate-300">
              {active.tagline}
            </p>

            <ul className="mt-7 space-y-3">
              {active.capabilities.map((cap, i) => (
                <li
                  key={cap}
                  className="flex animate-fade-up items-start gap-3 [animation-fill-mode:both]"
                  style={{ animationDelay: `${160 + i * 70}ms` }}
                >
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-primary-600 dark:text-primary-400"
                  />
                  <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {cap}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex animate-fade-up gap-3 rounded-2xl border border-primary-200/70 bg-primary-50/70 p-5 [animation-delay:420ms] [animation-fill-mode:both] dark:border-primary-800/50 dark:bg-primary-900/20">
              <Workflow
                size={18}
                className="mt-0.5 shrink-0 text-primary-700 dark:text-primary-400"
              />
              <p className="text-sm leading-relaxed text-primary-900 dark:text-primary-200">
                <span className="font-semibold">How it works: </span>
                {active.flow}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
