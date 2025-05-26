/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backdropBlur: {
        xl: '20px',
      },
      colors: {
        'primary-dark': '#0f172a',
        'glass': 'rgba(255, 255, 255, 0.05)',
      },
      boxShadow: {
        neon: '0 0 10px rgba(59, 130, 246, 0.7)',
      },
    },
  },
  plugins: [],
}