/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17211B',
        canvas: '#F5F7F2',
        brand: { 50: '#EEFBF2', 100: '#D7F5E1', 500: '#38A867', 600: '#288A52', 700: '#216F44', 900: '#173E2B' },
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
