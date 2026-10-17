/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './application.html', './validation.js'],
  theme: {
    extend: {
      colors: {
        forest: '#102d27',
        leaf: '#22c55e',
        paper: '#f8fafc',
        ink: '#0f172a',
        coral: '#f97316',
        muted: '#64748b'
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Manrope', 'sans-serif']
      }
    }
  },
  plugins: []
};