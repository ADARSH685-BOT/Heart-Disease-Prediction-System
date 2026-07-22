/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bfe2fe',
          300: '#93d0fd',
          400: '#60b4fa',
          500: '#3b93f6',
          600: '#2574eb',
          700: '#1d5ed8',
          800: '#1e4caf',
          900: '#1e4289',
          950: '#172a54',
        },
        clinic: {
          emerald: '#059669',
          sky: '#0ea5e9',
          navy: '#0b4f8a',
          mist: '#f0f9ff',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(15, 76, 129, 0.12)',
        soft: '0 10px 40px rgba(11, 79, 138, 0.08)',
      },
      backgroundImage: {
        'hero-mesh':
          'radial-gradient(at 20% 20%, rgba(14,165,233,0.25) 0, transparent 45%), radial-gradient(at 80% 0%, rgba(16,185,129,0.18) 0, transparent 40%), radial-gradient(at 50% 80%, rgba(37,116,235,0.15) 0, transparent 50%)',
      },
    },
  },
  plugins: [],
}
