import { useEffect, useState } from 'react'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const NAV_LINKS = [
  { href: '#problem', label: 'Why GHC' },
  { href: '#features', label: 'Platform' },
  { href: '#security', label: 'Security' },
  { href: '#ai', label: 'AI Assistant' },
  { href: '#recognition', label: 'Recognition' },
  { href: '#team', label: 'Team' },
  { href: '#demo', label: 'Live Demo' },
]

interface HeaderProps {
  onRequestDemo: () => void
}

export default function Header({ onRequestDemo }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeHash, setActiveHash] = useState('')
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sections = NAV_LINKS.map((link) => document.querySelector(link.href)).filter(
      (el): el is Element => Boolean(el),
    )
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveHash(`#${visible.target.id}`)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md transition-shadow dark:bg-slate-900/80 ${
        scrolled
          ? 'border-slate-200 shadow-sm dark:border-slate-800'
          : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-8">
        <a href="#top" className="flex items-center gap-2">
          <img src="/logo.png" alt="GHC" className="h-9 w-9 rounded-lg object-cover" />
          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Government Health Connect
          </span>
        </a>

        <nav className="hidden items-center gap-5 lg:flex xl:gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition ${
                activeHash === link.href
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-600 hover:text-primary-600 dark:text-slate-300 dark:hover:text-primary-400'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-primary-300 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-primary-600 dark:hover:text-primary-400"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            onClick={onRequestDemo}
            className="hidden rounded-full bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 lg:inline-block"
          >
            Request a Demo
          </button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-slate-700 dark:text-slate-200 lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onRequestDemo()
              }}
              className="mt-2 rounded-full bg-primary-600 px-5 py-2 text-center text-sm font-semibold text-white"
            >
              Request a Demo
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
