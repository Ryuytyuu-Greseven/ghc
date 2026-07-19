import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('ghc-theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage may be blocked
  }
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    // matchMedia may be unavailable
  }
  return 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  try {
    localStorage.setItem('ghc-theme', theme)
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = () =>
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      applyTheme(next) // apply immediately, don't wait for effect
      return next
    })

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
