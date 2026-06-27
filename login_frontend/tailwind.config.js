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
      screens: {
        '3xl': '1920px',
      },
      keyframes: {
        'voice-bar': {
          '0%, 100%': { height: '15%', opacity: '0.5' },
          '50%': { height: '100%', opacity: '1' },
        },
        'bot-ping': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'typing-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-5px)', opacity: '1' },
        },
      },
      animation: {
        'voice-bar': 'voice-bar 0.8s ease-in-out infinite',
        'bot-ping': 'bot-ping 1.6s ease-out infinite',
        'slide-up': 'slide-up 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
