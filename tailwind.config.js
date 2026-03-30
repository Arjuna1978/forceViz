/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
theme: {
    extend: {
      keyframes: {
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'slide-down': {
          'from': { transform: 'translate(-50%, -1rem)', opacity: '0' },
          'to': { transform: 'translate(-50%, 0)', opacity: '1' },
        },
        'slide-left': {
          'from': { transform: 'translateX(1rem)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-down': 'slide-down 0.3s ease-out forwards',
        'slide-left': 'slide-left 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
}
