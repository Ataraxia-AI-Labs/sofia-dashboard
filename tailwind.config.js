/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    // S122: include lib/ + hooks/ + i18n/ so dynamic class strings declared
    // in helper modules (e.g. status badge color maps in lib/status-colors)
    // aren't purged in production builds.
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './i18n/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // S122: safelist runtime-computed class names. Tailwind's PurgeCSS removes
  // any class it can't see in the source — these patterns are constructed
  // dynamically (e.g. `bg-status-${color}`, `text-brand-${tier}`) and would
  // otherwise be stripped from the production CSS bundle, leaving badges
  // and tier indicators unstyled in prod but fine in dev.
  safelist: [
    { pattern: /^bg-status-(success|warning|danger|info)(\/\d+)?$/ },
    { pattern: /^text-status-(success|warning|danger|info)$/ },
    { pattern: /^border-status-(success|warning|danger|info)(\/\d+)?$/ },
    { pattern: /^bg-brand-(purple|cyan|gold)(-light|-dark)?(\/\d+)?$/ },
    { pattern: /^text-brand-(purple|cyan|gold)(-light|-dark)?$/ },
    { pattern: /^border-brand-(purple|cyan|gold)(-light|-dark)?(\/\d+)?$/ },
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
          DEFAULT: 'rgb(var(--color-border-rgb) / <alpha-value>)',
          2: 'rgb(var(--color-border-2-rgb) / <alpha-value>)',
        },
        white: 'var(--color-white)',
        brand: {
          purple: 'rgb(139 92 246 / <alpha-value>)',
          'purple-light': 'rgb(167 139 250 / <alpha-value>)',
          'purple-dark': 'rgb(109 40 217 / <alpha-value>)',
          cyan: 'rgb(6 214 160 / <alpha-value>)',
          'cyan-light': 'rgb(52 211 153 / <alpha-value>)',
          gold: 'rgb(245 200 66 / <alpha-value>)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          dim: 'var(--color-text-dim)',
        },
        status: {
          success: 'rgb(6 214 160 / <alpha-value>)',
          warning: 'rgb(245 200 66 / <alpha-value>)',
          danger: 'rgb(239 68 68 / <alpha-value>)',
          info: 'rgb(139 92 246 / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        body: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      spacing: {
        // 8px grid enforcement
        '0.5': '4px',
        '1': '8px',
        '1.5': '12px',
        '2': '16px',
        '2.5': '20px',
        '3': '24px',
        '4': '32px',
        '5': '40px',
        '6': '48px',
        '8': '64px',
        '10': '80px',
        '12': '96px',
        '16': '128px',
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-up': 'fadeUp 0.25s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'sentient-breathe': 'sentientBreathe 3s ease-in-out infinite',
        'sentient-pulse': 'sentientPulse 3s ease-in-out infinite',
        'loader-dot': 'loaderDot 1.2s ease-in-out infinite',
        // Legacy compatibility
        'logo-breathe': 'sentientBreathe 3s ease-in-out infinite',
        'pulse-soft': 'sentientPulse 2s ease-in-out infinite',
        'glow-pulse': 'sentientPulse 3s ease-in-out infinite',
        'count-up': 'fadeIn 0.8s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        sentientBreathe: { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.6', transform: 'scale(0.97)' } },
        sentientPulse: { '0%, 100%': { opacity: '0.4' }, '50%': { opacity: '1' } },
        loaderDot: { '0%, 100%': { opacity: '0.15' }, '50%': { opacity: '0.8' } },
      },
    },
  },
  plugins: [],
}
