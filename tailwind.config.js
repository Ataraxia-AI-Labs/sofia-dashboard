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
        white: 'var(--color-white)',
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
