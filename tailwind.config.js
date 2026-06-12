/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fatale: 'rgb(var(--theme-primary) / <alpha-value>)',
        secondary: 'rgb(var(--theme-secondary) / <alpha-value>)',
        systemBg: 'rgb(var(--theme-bg) / <alpha-value>)',
        systemText: 'rgb(var(--theme-text) / <alpha-value>)',
      }
    },
  },
  plugins: [],
}
