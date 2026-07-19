/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'bot-ping': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-150%)' },
          '35%': { transform: 'translateX(220%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow:
              '0 3px 12px -2px rgba(245, 158, 11, 0.4), 0 0 0 0 rgba(245, 158, 11, 0.35)',
          },
          '50%': {
            boxShadow: '0 3px 12px -2px rgba(245, 158, 11, 0.4), 0 0 0 5px rgba(245, 158, 11, 0)',
          },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'voice-bar': {
          '0%, 100%': { height: '15%', opacity: '0.5' },
          '50%': { height: '100%', opacity: '1' },
        },
        'typing-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-5px)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'bot-ping': 'bot-ping 1.6s ease-out infinite',
        shimmer: 'shimmer 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-left': 'slide-in-left 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'voice-bar': 'voice-bar 0.8s ease-in-out infinite',
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
