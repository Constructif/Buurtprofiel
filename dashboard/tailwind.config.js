/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1f3b4d',
          soft: '#e3edf5',
        },
        accent: {
          DEFAULT: '#f0a500',
          soft: '#fff6dd',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f7f8fa',
        },
        danger: '#c0392b',
        success: '#1f7a4d',
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
