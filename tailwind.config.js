/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: 'var(--color-void)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          2: 'var(--color-surface-2)',
          3: 'var(--color-surface-3)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          2: 'var(--color-border-2)',
        },
        brand: {
          purple: '#8B5CF6',
          'purple-light': '#A78BFA',
          'purple-dark': '#6D28D9',
          cyan: '#06D6A0',
          'cyan-light': '#34D399',
          gold: '#F5C842',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          dim: 'var(--color-text-dim)',
        },
        status: {
          success: '#06D6A0',
          warning: '#F5C842',
          danger: '#EF4444',
          info: '#3B82F6',
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        body: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-up': 'fadeUp 0.5s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'count-up': 'countUp 0.8s ease-out',
        'logo-breathe': 'logoBreathe 3s ease-in-out infinite',
        'loader-dot': 'loaderDot 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        logoBreathe: { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.7', transform: 'scale(0.96)' } },
        loaderDot: { '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' }, '50%': { opacity: '1', transform: 'scale(1.2)' } },
      },
    },
  },
  plugins: [],
}
