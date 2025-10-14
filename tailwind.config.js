/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './manager/**/*.{js,ts,jsx,tsx}', // 👈 Add this line
  ],
  theme: {
    extend: {},
  },
}
