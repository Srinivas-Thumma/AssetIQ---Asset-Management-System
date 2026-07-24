/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f6f4fa',     // Layout background (soft lavender-grey tint)
          55: '#fefcfe',
          100: '#f3f1f7',    // Card borders
          200: '#e5e1ed',    // Inputs & dividers
          250: '#d0cadb',
          300: '#d0cadb',
          400: '#b3a8c2',    // Subtle descriptions
          500: '#9385a8',    // Standard grey-purple labels
          600: '#77698f',    // Secondary text
          650: '#62557a',
          700: '#62557a',
          800: '#524669',    // Primary body text
        },
        blue: {
          50: '#f3efff',
          100: '#e7dbff',
          200: '#d0baff',
          300: '#af8cff',
          400: '#8c56ff',
          500: '#6f25ff',
          550: '#f43f5e',    // Notification bubble accent (rose-red)
          600: '#6c3ce9',    // Primary brand action buttons & highlights
          700: '#592ecc',    // Hover actions
          800: '#42149e',
          900: '#310d7a',
        }
      }
    },
  },
  plugins: [],
}
