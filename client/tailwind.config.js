/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E8C97A',
          dark: '#8B6914',
        },
        cyan: {
          electric: '#00D4FF',
        },
        surface: {
          base: '#0A0A0B',
          DEFAULT: '#111114',
          card: '#16161A',
          hover: '#1E1E24',
        },
        border: '#2A2A32',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Cormorant Garamond', 'serif'],
      },
    },
  },
  plugins: [],
}
