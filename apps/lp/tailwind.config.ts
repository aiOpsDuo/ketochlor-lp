import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          institutional: '#26468A',
        },
        navy: '#142A52',
        gold: '#F0BA40',
        graytxt: '#646C78',
        lighttint: '#F7F9FC',
        cardborder: '#E6E8EC',
      },
      fontFamily: {
        heading: ['Sora', 'Liberation Sans', 'sans-serif'],
        body: ['Inter', 'Liberation Sans', 'sans-serif'],
      },
      maxWidth: {
        content: '1248px',
      },
    },
  },
  plugins: [],
} satisfies Config
