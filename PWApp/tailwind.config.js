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
          DEFAULT: '#FF6B6B',
          light: '#FF8E8E',
          dark: '#E85555',
        },
        secondary: {
          DEFAULT: '#4ECDC4',
          light: '#7BDDD6',
          dark: '#3BB5AC',
        },
        accent: {
          DEFAULT: '#FFE66D',
          dark: '#FFD93D',
        },
        potato: {
          DEFAULT: '#D4A574',
          light: '#E6C9A8',
        },
        weather: {
          sunny: '#FFB347',
          cloudy: '#B8C5D6',
          rainy: '#6DB5ED',
          snowy: '#E8F4F8',
        },
        success: '#51CF66',
        error: '#FF6B6B',
        warning: '#FFD93D',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        fun: ['Fredoka', 'Poppins', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'pulse-slow': 'pulse 1.5s ease-in-out infinite',
        'confetti-fall': 'confetti-fall 3s ease-out forwards',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-5deg)' },
          '75%': { transform: 'rotate(5deg)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
