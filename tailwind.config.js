/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/renderer/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#baddff',
          300: '#7cc2ff',
          400: '#36a3ff',
          500: '#0c85f2',
          600: '#0068cf',
          700: '#0052a7',
          800: '#00468a',
          900: '#063b72',
        }
      }
    },
  },
  plugins: [],
}
