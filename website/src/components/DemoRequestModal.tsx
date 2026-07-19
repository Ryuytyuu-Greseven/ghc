import { useEffect, useState, type FormEvent } from 'react'
import emailjs from '@emailjs/browser'
import {
  X,
  User,
  Mail,
  Building2,
  Phone,
  MessageSquare,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

interface DemoRequestModalProps {
  open: boolean
  onClose: () => void
}

interface FormState {
  name: string
  email: string
  organization: string
  phone: string
  message: string
}

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  organization: '',
  phone: '',
  message: '',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function DemoRequestModal({ open, onClose }: DemoRequestModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  // Reset to a clean form each time the modal is opened fresh.
  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM)
      setErrors({})
      setStatus('idle')
      setErrorMessage('')
    }
  }, [open])

  if (!open) return null

  const setField = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) nextErrors.name = 'Please enter your name.'
    if (!form.email.trim()) nextErrors.email = 'Please enter your work email.'
    else if (!EMAIL_RE.test(form.email)) nextErrors.email = 'Please enter a valid email address.'
    if (!form.organization.trim()) nextErrors.organization = 'Please enter your organization.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      setStatus('error')
      setErrorMessage(
        'Email sending is not configured yet. Add your EmailJS keys to .env to enable this form.',
      )
      return
    }

    setStatus('submitting')
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: form.name,
          reply_to: form.email,
          organization: form.organization,
          phone: form.phone || 'Not provided',
          message: form.message || 'No additional details provided.',
        },
        { publicKey: EMAILJS_PUBLIC_KEY },
      )
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMessage("Something went wrong sending your request — please try again, or email us directly.")
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
        className="relative w-full max-w-lg animate-fade-up rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={20} />
        </button>

        {status === 'success' ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
              Request received
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Thanks, {form.name.split(' ')[0]}. Our team will reach out to{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">{form.email}</span>{' '}
              within one business day to schedule your walkthrough.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 id="demo-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">
              Request a Demo
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Tell us a bit about your organization and we'll set up a walkthrough of GHC
              tailored to your network.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="demo-name"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >
                  Full name
                </label>
                <div className="relative mt-1.5">
                  <User
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="demo-name"
                    type="text"
                    value={form.name}
                    onChange={setField('name')}
                    placeholder="Jane Rao"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                {errors.name && <p className="mt-1.5 text-xs text-rose-500">{errors.name}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="demo-email"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    Work email
                  </label>
                  <div className="relative mt-1.5">
                    <Mail
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="demo-email"
                      type="email"
                      value={form.email}
                      onChange={setField('email')}
                      placeholder="jane@district-health.gov"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  {errors.email && <p className="mt-1.5 text-xs text-rose-500">{errors.email}</p>}
                </div>

                <div>
                  <label
                    htmlFor="demo-phone"
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  >
                    Phone <span className="normal-case text-slate-400">(optional)</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Phone
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="demo-phone"
                      type="tel"
                      value={form.phone}
                      onChange={setField('phone')}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="demo-org"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >
                  Organization / facility network
                </label>
                <div className="relative mt-1.5">
                  <Building2
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="demo-org"
                    type="text"
                    value={form.organization}
                    onChange={setField('organization')}
                    placeholder="District Health Department"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                {errors.organization && (
                  <p className="mt-1.5 text-xs text-rose-500">{errors.organization}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="demo-message"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >
                  What would you like to see?{' '}
                  <span className="normal-case text-slate-400">(optional)</span>
                </label>
                <div className="relative mt-1.5">
                  <MessageSquare size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
                  <textarea
                    id="demo-message"
                    rows={3}
                    value={form.message}
                    onChange={setField('message')}
                    placeholder="e.g. bed management and AI inventory redistribution across 12 PHCs"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {status === 'error' && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-600 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending request...
                  </>
                ) : status === 'error' ? (
                  'Try Again'
                ) : (
                  'Send Request'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
