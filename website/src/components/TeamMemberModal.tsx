import { useEffect } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { LinkedinIcon } from './BrandIcons'

interface TeamMemberModalMember {
  id: number
  name: string
  role: string
  bio: string
  photo?: string
  linkedin: string
}

interface TeamMemberModalProps {
  member: TeamMemberModalMember | null
  onClose: () => void
  avatarGradient: string
  initials: string
}

export default function TeamMemberModal({
  member,
  onClose,
  avatarGradient,
  initials,
}: TeamMemberModalProps) {
  useEffect(() => {
    if (!member) return
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [member, onClose])

  if (!member) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        className="relative w-full max-w-md animate-fade-up rounded-3xl bg-white p-8 text-center shadow-2xl dark:bg-slate-900 sm:p-10"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={20} />
        </button>

        {member.photo ? (
          <img
            src={member.photo}
            alt={member.name}
            className="mx-auto h-32 w-32 rounded-full object-cover shadow-lg ring-4 ring-white dark:ring-slate-800"
          />
        ) : (
          <div
            className={`mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br text-3xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-slate-800 ${avatarGradient}`}
          >
            {initials}
          </div>
        )}

        <h3 id="team-modal-title" className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">
          {member.name}
        </h3>
        <p className="text-sm font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
          {member.role}
        </p>

        <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {member.bio}
        </p>

        <p className="mx-auto mt-4 max-w-sm text-xs leading-relaxed text-slate-400 dark:text-slate-500">
          Part of the six-person team behind Government Health Connect.
        </p>

        <a
          href={member.linkedin}
          target={member.linkedin !== '#' ? '_blank' : undefined}
          rel={member.linkedin !== '#' ? 'noreferrer' : undefined}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <LinkedinIcon size={15} />
          Connect on LinkedIn
          <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}
