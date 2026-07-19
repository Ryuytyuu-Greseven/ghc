import type { ReactNode } from 'react'
import { useInView } from '../hooks/useInView'

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  /** 'up' slides in from below (default); 'left'/'right' slide in horizontally. */
  direction?: 'up' | 'left' | 'right'
}

const HIDDEN_TRANSFORM = {
  up: 'translate-y-6',
  left: '-translate-x-6',
  right: 'translate-x-6',
}

export default function Reveal({ children, className = '', delay = 0, direction = 'up' }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        inView ? 'translate-x-0 translate-y-0 opacity-100' : `${HIDDEN_TRANSFORM[direction]} opacity-0`
      } ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}
