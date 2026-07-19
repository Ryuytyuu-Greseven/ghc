import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { LinkedinIcon } from './BrandIcons'
import Reveal from './Reveal'
import TeamMemberModal from './TeamMemberModal'

interface TeamMember {
  id: number
  name: string
  role: string
  bio: string
  photo?: string
  linkedin: string
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Rukmesh Pilla',
    photo: '/team/rukmesh.png',
    role: 'Team Member',
    linkedin: 'https://www.linkedin.com/in/ryuytyuu-greseven',
    bio: '"Public healthcare here runs on paper registers, phone calls, and people trying their best with what they\'ve got. We didn\'t build GHC because we thought we were smarter than that system — we built it because the people working inside it deserve tools that keep up with everything they\'re already doing."',
  },
  {
    name: 'Matsa Vign Dinesh',
    photo: '/team/dinesh.png',
    role: 'Team Member',
    linkedin: 'https://www.linkedin.com/in/dinesh-mathsa-305759199',
    bio: '"Almost every problem we looked at traced back to the same root cause: information that existed somewhere, just not where it was needed, when it was needed. A missing bed, an expired medicine, a doctor no one could locate — different symptoms, same disease. GHC is our attempt at treating the actual disease."',
  },
  {
    name: 'Suresh Lingala',
    photo: '/team/suresh.png',
    role: 'Team Member',
    linkedin: 'https://www.linkedin.com/in/lingalasuresh',
    bio: '"We didn\'t set out to build another dashboard. We set out to close the gap between what\'s actually happening on the ground in a clinic and what an administrator sitting in an office can see. If a system doesn\'t reflect reality in real time, it isn\'t really helping anyone — it\'s just paperwork with better formatting."',
  },
  {
    name: 'Raghu Nodagala',
    photo: '/team/raghu.png',
    role: 'Team Member',
    bio: '"None of us work in healthcare. What we are is a group of people who got frustrated watching a broken, disconnected system fail the people who show up to keep it running every day. GHC was our attempt to actually fix that, not just build another tool that documents the problem."',
    linkedin: 'https://www.linkedin.com/in/raghu-nodagala',
  },
  {
    name: 'Sai Mahendra Varma Buddharaju',
    photo: '/team/mahendra.png',
    role: 'Team Member',
    linkedin: 'https://www.linkedin.com/in/saimahendravarmabuddharaju',
    bio: '"A lot of software gets built for whoever is paying for it, not for whoever has to use it every day. We wanted GHC to hold up for a nurse on a night shift at a rural clinic just as much as it does for a district administrator — because a system that only works at the top doesn\'t actually work."',
  },
  {
    name: 'Jayram Jami',
    photo: '/team/jayram.png',
    role: 'Team Member',
    linkedin: 'https://www.linkedin.com/in/jay-ram-jami',
    bio: '"We kept coming back to one idea: public healthcare doesn\'t struggle because people don\'t care, it struggles because the systems around them don\'t give them what they need to do their jobs well. Fix the system, and you\'re really just giving people who already care the tools to prove it."',
  },
].map((member, i) => ({
  id: i,
  ...member,
}))

const AVATAR_GRADIENTS = [
  'from-primary-400 to-primary-600',
  'from-amber-400 to-orange-500',
]

const VISIBLE_COUNT = 3
const AUTO_ADVANCE_MS = 5000

function getInitials(name: string) {
  const words = name.split(' ')
  return [words[0], words[words.length - 1]]
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function Team() {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [paused, setPaused] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selectedMember = TEAM_MEMBERS.find((m) => m.id === selectedId) ?? null

  useEffect(() => {
    if (paused) return
    const timer = setTimeout(() => {
      setDirection(1)
      setIndex((i) => (i + 1) % TEAM_MEMBERS.length)
    }, AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [index, paused])

  const goTo = (next: number, dir: 1 | -1) => {
    setDirection(dir)
    setIndex((next + TEAM_MEMBERS.length) % TEAM_MEMBERS.length)
  }

  const visible = Array.from({ length: VISIBLE_COUNT }, (_, i) => {
    const memberIndex = (index + i) % TEAM_MEMBERS.length
    return { ...TEAM_MEMBERS[memberIndex], slot: i, memberIndex }
  })

  return (
    <section id="team" className="bg-white py-24 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
            Our Team
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Six people, one platform.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
            GHC started as a hackathon idea from a team of six who watched public health
            workers juggle paper registers, phone-call requisitions, and disconnected
            spreadsheets — and decided healthcare infrastructure deserved better tooling.
            What began as a weekend build for Google Cloud's Build with AI hackathon grew
            into a full operational platform, now recognized by the Central Government.
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-14 max-w-5xl">
          <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              key={index}
              className={`grid gap-6 sm:grid-cols-3 ${
                direction === 1 ? 'animate-slide-in-right' : 'animate-slide-in-left'
              }`}
            >
              {visible.map((m) => (
                <div
                  key={m.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedId(m.id)
                    }
                  }}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-primary-800 dark:hover:shadow-slate-950/40"
                >
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={m.name}
                      className="mx-auto h-24 w-24 rounded-full object-cover shadow-md ring-2 ring-white dark:ring-slate-800"
                    />
                  ) : (
                    <div
                      className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br text-2xl font-bold text-white shadow-md ring-2 ring-white dark:ring-slate-800 ${
                        AVATAR_GRADIENTS[m.memberIndex % AVATAR_GRADIENTS.length]
                      }`}
                    >
                      {getInitials(m.name)}
                    </div>
                  )}
                  <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                    {m.name}
                  </h3>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
                    {m.role}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {m.bio}
                  </p>
                  <a
                    href={m.linkedin}
                    target={m.linkedin !== '#' ? '_blank' : undefined}
                    rel={m.linkedin !== '#' ? 'noreferrer' : undefined}
                    aria-label={`${m.name} on LinkedIn`}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 mt-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-primary-400 hover:text-primary-600 dark:border-slate-700 dark:hover:border-primary-500 dark:hover:text-primary-400"
                  >
                    <LinkedinIcon size={14} />
                  </a>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(index - 1, -1)}
              aria-label="Previous team member"
              className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-primary-600 dark:hover:text-primary-400 lg:-translate-x-14"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1, 1)}
              aria-label="Next team member"
              className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 translate-x-4 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-primary-600 dark:hover:text-primary-400 lg:translate-x-14"
            >
              <ChevronRight size={18} />
            </button>

            <div className="mt-8 flex items-center justify-center gap-2">
              {TEAM_MEMBERS.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => goTo(i, i > index ? 1 : -1)}
                  aria-label={`Start from ${m.name}`}
                  aria-current={i === index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === index
                      ? 'w-6 bg-primary-600 dark:bg-primary-400'
                      : 'w-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <TeamMemberModal
        member={selectedMember}
        onClose={() => setSelectedId(null)}
        avatarGradient={
          selectedMember ? AVATAR_GRADIENTS[selectedMember.id % AVATAR_GRADIENTS.length] : ''
        }
        initials={selectedMember ? getInitials(selectedMember.name) : ''}
      />
    </section>
  )
}
