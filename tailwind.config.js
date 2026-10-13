/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17211B',
        canvas: '#F5F7F2',
        // Muted jade: calm enough for long planning sessions while retaining
        // accessible contrast for actions, links and dark-mode highlights.
        brand: { 50: '#F2F7F4', 100: '#DFEBE4', 200: '#C1D8CA', 300: '#9BC1AA', 400: '#72A68A', 500: '#548A70', 600: '#3F705A', 700: '#345B4B', 800: '#2B493D', 900: '#253D34', 950: '#13231D' },
        amber: { 50: '#FFF9E8', 100: '#FFF0BE', 500: '#E7A723' },
      },
      boxShadow: { card: '0 1px 2px rgba(23,33,27,.05), 0 8px 30px rgba(23,33,27,.04)' },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Segoe UI Variable Display', 'Segoe UI', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
