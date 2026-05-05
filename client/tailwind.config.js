/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: '#0D0D0D',
        paper: '#F5F0E8',
        cream: '#EDE8DC',
        accent: '#E8572A',
        'accent-dark': '#C4421C',
        muted: '#8B8577',
        'card-bg': '#FDFAF5',
        border: '#DDD8CC',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        blink: 'blink 1s step-end infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
