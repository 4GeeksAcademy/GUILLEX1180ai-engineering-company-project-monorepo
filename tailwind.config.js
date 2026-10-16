/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './application.html', './validation.js'],
  theme: {
    extend: {
      colors: {
        forest: '#102d27',
        leaf: '#b8e45b',
        paper: '#f7f7f2',
        ink: '#17221f',
        muted: '#65716b',
        coral: '#9b3525'
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Manrope', 'sans-serif']
      }
    }
  },
  plugins: []
};