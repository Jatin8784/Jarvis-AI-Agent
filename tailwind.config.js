/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Orbitron"', 'monospace'],
        body: ['"Share Tech Mono"', 'monospace'],
      },
      colors: {
        jarvis: {
          bg:       '#050810',
          panel:    '#080d1a',
          border:   '#0d1f3c',
          accent:   '#00d4ff',
          accent2:  '#0066ff',
          glow:     '#00aaff',
          text:     '#c8e6ff',
          muted:    '#4a7090',
          success:  '#00ff88',
          warn:     '#ffaa00',
          danger:   '#ff3366',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'flicker': 'flicker 4s ease-in-out infinite',
        'typing': 'typing 1s steps(3) infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.8' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.9' },
          '97%': { opacity: '1' },
        },
        typing: {
          '0%': { content: '"▋"' },
          '33%': { content: '"▋▋"' },
          '66%': { content: '"▋▋▋"' },
        }
      },
      boxShadow: {
        'glow-sm': '0 0 8px rgba(0, 212, 255, 0.3)',
        'glow':    '0 0 20px rgba(0, 212, 255, 0.4)',
        'glow-lg': '0 0 40px rgba(0, 212, 255, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(0, 212, 255, 0.1)',
      }
    },
  },
  plugins: [],
}
