import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  Mic,
  Send,
  Keyboard,
  Workflow,
  Siren,
  ShieldCheck,
  Stethoscope,
  AlertTriangle,
} from 'lucide-react'
import Reveal from './Reveal'

const VOICE_BARS = [0, 1, 2, 3, 4, 5, 6]

const DEMO_EXCHANGES = [
  {
    q: 'Which branches are below the paracetamol threshold this week?',
    a: "3 branches are below threshold. Rampur CHC has 340 units of surplus — I've drafted a transfer request to cover all 3. Approve?",
  },
  {
    q: 'Fetch bed availability for King George Hospital',
    a: '12 of 40 beds are available right now — 3 in ICU, 9 in the general ward.',
  },
  {
    q: 'Who is the medical officer in-charge of PHC Kommadi?',
    a: 'Dr. Anitha Rao is in-charge, on duty since 9:00 AM today.',
  },
]

type DemoPhase = 'typing' | 'sending' | 'thinking' | 'answered' | 'pause'
type ChatMessage = { id: number; role: 'user' | 'assistant'; text: string }

const TYPE_SPEED_MS = 32
const PHASE_DELAYS: Record<Exclude<DemoPhase, 'typing'>, number> = {
  sending: 400,
  thinking: 1100,
  answered: 2600,
  pause: 500,
}
const MAX_HISTORY = 6

const CAPABILITIES = [
  {
    icon: Workflow,
    title: 'Multi-agent supervisor',
    description:
      'A LangGraph supervisor classifies intent and routes to Hospital, Patient, Staff, or Inventory sub-agents.',
  },
  {
    icon: ShieldCheck,
    title: 'Role & permission aware',
    description:
      "Decodes the caller's JWT so a doctor's query is auto-scoped to their own hospital — never another branch.",
  },
  {
    icon: Stethoscope,
    title: 'Clinical decision support',
    description:
      'Analyzes reported symptoms to suggest vitals to check and possible diagnoses.',
  },
  {
    icon: AlertTriangle,
    title: 'Prescription safety checks',
    description:
      'Flags drug interactions and schedules post-meal reminders during the prescribing flow.',
  },
  {
    icon: Siren,
    title: 'Predictive supply redistribution',
    description:
      'Watches stock thresholds across facilities and proposes branch-to-branch transfers before a shortage hits.',
  },
  {
    icon: Mic,
    title: 'Voice, chat & 7 languages',
    description:
      'English, Hindi, Telugu, Bengali, Kannada, Tamil, and Gujarati — by text or speech.',
  },
]

const EXAMPLE_COMMANDS = [
  'Audit my inventory for low stock medicines',
  'Fetch beds availability for King George Hospital',
  'Who is the medical officer in-charge of PHC Kommadi?',
  'Search for patient named Rahul',
  'List available pediatricians in all hospitals',
  'Find hospitals that have a cardiologist',
]

let messageId = 0

export default function AICapabilities() {
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [exchangeIndex, setExchangeIndex] = useState(0)
  const [typedLength, setTypedLength] = useState(0)
  const [phase, setPhase] = useState<DemoPhase>('typing')
  const [history, setHistory] = useState<ChatMessage[]>([])
  const threadRef = useRef<HTMLDivElement>(null)

  const exchange = DEMO_EXCHANGES[exchangeIndex]
  const typedQuery = exchange.q.slice(0, typedLength)

  const pushMessage = (role: ChatMessage['role'], text: string) => {
    setHistory((h) => [...h, { id: messageId++, role, text }].slice(-MAX_HISTORY))
  }

  useEffect(() => {
    if (phase === 'typing') {
      if (typedLength < exchange.q.length) {
        const timer = window.setTimeout(() => setTypedLength((l) => l + 1), TYPE_SPEED_MS)
        return () => clearTimeout(timer)
      }
      const timer = window.setTimeout(() => {
        pushMessage('user', exchange.q)
        setPhase('sending')
      }, PHASE_DELAYS.sending)
      return () => clearTimeout(timer)
    }

    if (phase === 'thinking') {
      const timer = window.setTimeout(() => {
        pushMessage('assistant', exchange.a)
        setPhase('answered')
      }, PHASE_DELAYS.thinking)
      return () => clearTimeout(timer)
    }

    if (phase === 'pause') {
      const timer = window.setTimeout(() => {
        const next = (exchangeIndex + 1) % DEMO_EXCHANGES.length
        if (next === 0) setHistory([])
        setTypedLength(0)
        setExchangeIndex(next)
        setPhase('typing')
      }, PHASE_DELAYS.pause)
      return () => clearTimeout(timer)
    }

    const nextPhase: Record<'sending' | 'answered', DemoPhase> = {
      sending: 'thinking',
      answered: 'pause',
    }
    const timer = window.setTimeout(
      () => setPhase(nextPhase[phase as 'sending' | 'answered']),
      PHASE_DELAYS[phase as 'sending' | 'answered'],
    )
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, typedLength, exchange.q, exchange.a])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [history, phase])

  const showThinking = phase === 'thinking'

  return (
    <section id="ai" className="relative overflow-hidden bg-white py-24 dark:bg-slate-900">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 60% at 80% 20%, rgba(20,184,166,0.12) 0%, rgba(20,184,166,0) 70%)',
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal direction="left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:border-primary-800 dark:bg-primary-900/40 dark:text-primary-300">
              Powered by Google Vertex AI
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              An AI agent that actually runs operations — not just a chatbot.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
              GHC's conversational agent is built with LangGraph and Google Vertex AI
              (Gemini 3.5 Flash), routing requests through purpose-built nodes that can check
              stock, raise requisitions, and flag prescription safety issues autonomously.
            </p>

            <dl className="mt-10 grid gap-6 sm:grid-cols-2">
              {CAPABILITIES.map((cap, i) => (
                <Reveal key={cap.title} delay={i * 70} className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                    <cap.icon size={18} />
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-slate-900 dark:text-white">
                      {cap.title}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {cap.description}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>

            <Reveal delay={120} className="mt-9">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                Try asking the agent
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLE_COMMANDS.map((cmd) => (
                  <span
                    key={cmd}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-600 transition-colors duration-200 hover:border-primary-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-primary-600 dark:hover:text-slate-100"
                  >
                    "{cmd}"
                  </span>
                ))}
              </div>
            </Reveal>
          </Reveal>

          <Reveal direction="right" delay={150} className="relative">
            <div className="mx-auto flex max-w-md flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-xl dark:border-slate-700/60 dark:bg-slate-800/60 dark:shadow-2xl dark:backdrop-blur">
              <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4 dark:border-slate-700/60">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                  <Bot size={20} />
                </span>
                <span className="shrink-0 text-base font-semibold text-slate-800 dark:text-slate-200">
                  GHC Assistant
                </span>

                <div className="ml-1 flex gap-0.5 rounded-full bg-slate-200/70 p-0.5 dark:bg-slate-900/60">
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 ${
                      inputMode === 'text'
                        ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400'
                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                    }`}
                  >
                    <Keyboard size={13} />
                    Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('voice')}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 ${
                      inputMode === 'voice'
                        ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400'
                        : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                    }`}
                  >
                    <Mic size={13} />
                    Voice
                  </button>
                </div>

                <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-bot-ping rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  Live
                </span>
              </div>

              <div ref={threadRef} className="flex h-80 flex-col space-y-3 overflow-y-auto pt-4">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-200/70 px-4 py-2.5 text-sm text-slate-800 dark:bg-slate-700/70 dark:text-slate-100">
                  👋 Hi, I'm the GHC Assistant. Ask me about beds, inventory, staff, or
                  patients — by text or voice.
                </div>

                {history.map((msg) =>
                  msg.role === 'user' ? (
                    <div
                      key={msg.id}
                      className="ml-auto max-w-[80%] animate-fade-up rounded-2xl rounded-tr-sm bg-primary-600 px-4 py-2.5 text-sm text-white [animation-duration:0.3s]"
                    >
                      {msg.text}
                    </div>
                  ) : (
                    <div
                      key={msg.id}
                      className="max-w-[85%] animate-fade-up rounded-2xl rounded-tl-sm bg-slate-200/70 px-4 py-2.5 text-sm text-slate-800 [animation-duration:0.4s] dark:bg-slate-700/70 dark:text-slate-100"
                    >
                      {msg.text}
                    </div>
                  ),
                )}

                {showThinking && (
                  <div className="flex w-fit animate-fade-up items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-200/70 px-4 py-3 [animation-duration:0.3s] dark:bg-slate-700/70">
                    <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-slate-500 dark:bg-slate-300 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-slate-500 dark:bg-slate-300 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-slate-500 dark:bg-slate-300 [animation-delay:300ms]" />
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700/60">
                {inputMode === 'text' ? (
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <span className="flex-1 truncate text-sm text-slate-600 dark:text-slate-300">
                      {phase === 'typing' && typedLength > 0 ? (
                        typedQuery
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">
                          Ask about beds, stock, staff…
                        </span>
                      )}
                      {phase === 'typing' && (
                        <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary-500 align-middle" />
                      )}
                    </span>
                    <button
                      type="button"
                      aria-label="Send message"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition ${
                        phase === 'sending' ? 'scale-90 bg-primary-700' : 'bg-primary-600 hover:bg-primary-700'
                      }`}
                    >
                      <Send size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <button
                      type="button"
                      aria-label="Start voice input"
                      className="flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-full bg-primary-600 text-white"
                    >
                      <Mic size={15} />
                    </button>
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      Listening…
                    </span>
                    <div className="flex h-6 flex-1 items-end justify-end gap-[3px]">
                      {VOICE_BARS.map((bar) => (
                        <span
                          key={bar}
                          className="w-[3px] animate-voice-bar rounded-full bg-primary-500 dark:bg-primary-400"
                          style={{ animationDelay: `${bar * 0.09}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
