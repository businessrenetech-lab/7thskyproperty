/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#012a4e',
          'navy-dark': '#001a33',
          'navy-light': '#0a3d6b',
          cyan: '#12b6f3',
          'cyan-hover': '#0ea5e9',
          'cyan-tint': '#e8f7fd',
          slate: '#64748b',
          'slate-light': '#94a3b8',
          border: '#e2e8f0',
          canvas: '#ffffff',
          surface: '#f8fafc',
          'surface-alt': '#f1f5f9'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-pill': '0 12px 36px -8px rgba(1, 42, 78, 0.08)',
        'soft-card': '0 10px 30px -10px rgba(1, 42, 78, 0.06)',
        'lifted': '0 20px 40px -12px rgba(1, 42, 78, 0.12)',
      }
    },
  },
  plugins: [],
}
