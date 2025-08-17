/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kaia.io Design System Colors
        kaia: {
          primary: '#BFF009', // Bright lime green accent
          primaryDark: '#9BC007', // Darker variant
          primaryLight: '#D4FF1A', // Lighter variant
          background: '#040404', // Very dark black
          surface: '#0A0A0A', // Slightly lighter black
          card: '#1A1A1A', // Card background
          border: '#3D3D3D', // Border color
          text: {
            primary: '#FFFFFF', // White text
            secondary: '#E0E0E0', // Light gray text
            muted: '#A0A0A0', // Muted text
            accent: '#BFF009', // Accent text
          },
          glass: {
            light: '#FFFFFF1A', // Light glass effect
            medium: '#FFFFFF4D', // Medium glass effect
            dark: '#FFFFFF0D', // Dark glass effect
          }
        },
        // Extended grays for better contrast
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'Red Hat Display', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Red Hat Display', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'kaia': '48px',
        'kaia-lg': '40px',
        'kaia-md': '32px',
        'kaia-sm': '24px',
      },
      backdropBlur: {
        'kaia': '32px',
        'kaia-lg': '36px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.5s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(191, 240, 9, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(191, 240, 9, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      boxShadow: {
        'kaia': '0 0 20px rgba(191, 240, 9, 0.3)',
        'kaia-lg': '0 0 30px rgba(191, 240, 9, 0.5)',
        'kaia-xl': '0 0 40px rgba(191, 240, 9, 0.7)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'kaia-gradient': 'linear-gradient(135deg, #BFF009 0%, #9BC007 100%)',
        'kaia-radial': 'radial-gradient(circle, #BFF009 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
}