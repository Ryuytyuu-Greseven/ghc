import { ArrowRight, PlayCircle, Mail } from 'lucide-react'
import Reveal from './Reveal'

interface DemoCTAProps {
  onRequestDemo: () => void
  onWatchDemo: () => void
}

export default function DemoCTA({ onRequestDemo, onWatchDemo }: DemoCTAProps) {
  return (
    <section id="demo" className="bg-slate-50 py-24 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <Reveal className="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 px-8 py-14 text-center shadow-xl transition-shadow duration-500 hover:shadow-2xl hover:shadow-primary-600/20 sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            See GHC running, end to end.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-primary-100">
            Watch GHC in action, or talk to us about a walkthrough tailored to your network.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={onWatchDemo}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-primary-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-50 hover:shadow-md sm:w-auto"
            >
              <PlayCircle size={18} />
              Watch Demo
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={onRequestDemo}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 px-7 py-3.5 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 sm:w-auto"
            >
              <Mail size={18} />
              Request a Demo
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
