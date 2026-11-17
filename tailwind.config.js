/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: '#101525', ink: '#0a0d18', gold: '#F7B2CB', blush: '#FFD3E2',
        rose: '#F28AB2', wine: '#7A2E52', ivory: '#FFF8F0',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        script: ['"Great Vibes"', 'cursive'],
        body: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
