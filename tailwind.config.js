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
          50: '#F8FAFF',
          100: '#EEF2FF',
          200: '#D5DCF0',
          300: '#B0BEDA',
          400: '#8B97B4',
          500: '#64748B',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'gold-sm': '0 2px 8px 0 rgba(201, 162, 68, 0.15)',
        'gold-md': '0 4px 20px 0 rgba(201, 162, 68, 0.2), 0 1px 4px 0 rgba(201, 162, 68, 0.1)',
        'navy-md': '0 4px 20px 0 rgba(6, 9, 26, 0.6), 0 1px 4px 0 rgba(6, 9, 26, 0.4)',
        'navy-lg': '0 8px 40px 0 rgba(6, 9, 26, 0.8), 0 2px 8px 0 rgba(6, 9, 26, 0.5)',
        'teal-sm': '0 2px 8px 0 rgba(20, 184, 166, 0.15)',
      },
      letterSpacing: {
        tight: '-0.03em',
        tighter: '-0.04em',
      },
      lineHeight: {
        relaxed: '1.7',
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'shimmer': 'shimmer 2s infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 162, 68, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(201, 162, 68, 0)' },
        },
      },
    },
  },
  plugins: [],
}
