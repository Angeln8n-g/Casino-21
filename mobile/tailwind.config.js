/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./services/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
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
    },
  },
  plugins: [],
};
