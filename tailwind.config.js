/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#074139',
          light: '#95D0CC',
          deep: '#0B1528',
          cyan: '#00E5FF',
          amber: '#F59E0B',
        },
      },
      fontFamily: {
        microgramma: ['var(--font-microgramma)', 'sans-serif'],
        sans: ['var(--font-geist-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
