/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#06091A',
          900: '#0B1020',
          800: '#111827',
          700: '#162035',
          600: '#1E2D47',
          500: '#263554',
          400: '#354B6B',
          100: '#D9E4F5',
          50:  '#EEF3FB',
        },
        gold: {
          200: '#F5E6B8',
          300: '#EDD278',
          400: '#E0BC48',
          500: '#C9A244',
          600: '#A67C2E',
          700: '#7D5C1A',
        },
        teal: {
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
        },
        slate: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'gold-sm':  '0 2px 8px 0 rgba(201, 162, 68, 0.18)',
        'gold-md':  '0 4px 20px 0 rgba(201, 162, 68, 0.22), 0 1px 4px 0 rgba(201, 162, 68, 0.12)',
        'card':     '0 1px 3px 0 rgba(15, 23, 42, 0.07), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card-md':  '0 4px 14px 0 rgba(15, 23, 42, 0.09), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'card-lg':  '0 8px 28px 0 rgba(15, 23, 42, 0.11), 0 4px 8px -4px rgba(15, 23, 42, 0.06)',
        'card-hover':'0 12px 36px 0 rgba(15, 23, 42, 0.13), 0 4px 10px -4px rgba(15, 23, 42, 0.08)',
      },
      letterSpacing: {
        tight:  '-0.03em',
        tighter:'-0.04em',
      },
      lineHeight: {
        relaxed: '1.7',
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease forwards',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'shimmer':    'shimmer 2s infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 162, 68, 0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(201, 162, 68, 0)' },
        },
      },
    },
  },
  plugins: [],
}
