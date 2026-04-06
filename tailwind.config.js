/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/web/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        casino: {
          bg: '#020617',
          surface: '#1e293b',
          'surface-light': '#334155',
          gold: '#fbbf24',
          'gold-dark': '#d97706',
          'gold-light': '#fde68a',
          emerald: '#10b981',
          'emerald-dark': '#059669',
          'emerald-light': '#6ee7b7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'gold': '0 0 30px rgba(251, 191, 36, 0.15), 0 0 60px rgba(251, 191, 36, 0.05)',
        'gold-lg': '0 0 40px rgba(251, 191, 36, 0.25), 0 0 80px rgba(251, 191, 36, 0.1)',
        'emerald': '0 0 30px rgba(16, 185, 129, 0.15), 0 0 60px rgba(16, 185, 129, 0.05)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'casino-gradient': 'radial-gradient(ellipse at top, #0f172a 0%, #020617 50%, #000000 100%)',
        'gold-gradient': 'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #fbbf24 100%)',
        'surface-gradient': 'linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(30,41,59,0.4) 100%)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'card-enter': 'cardEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(251, 191, 36, 0.1)' },
          '50%': { boxShadow: '0 0 40px rgba(251, 191, 36, 0.25)' },
        },
        cardEnter: {
          '0%': { transform: 'scale(0.8) rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotateY(0deg)', opacity: '1' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}