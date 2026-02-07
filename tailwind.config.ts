import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'sage-green': {
          DEFAULT: '#5A6B50',      // Darker for text contrast (WCAG AA)
          light: '#7B8A72',        // Original, for decorative use
          dark: '#3D4A34',         // Deep green for headers
        },
        'blood-orange': {
          DEFAULT: '#E85A2B',
          light: '#F0916B',
          dark: '#C74516',
        },
        'lemon-cream': {
          DEFAULT: '#F5E6A8',
          light: '#FFF8E1',
        },
        'cream': {
          DEFAULT: '#F5F1E8',
          warm: '#F9F6F0',         // Warmer variant
        },
        'earth-brown': '#8B7355',  // New: for organic accents
        'terracotta': '#D4816B',   // New: warm accent
      },
      borderRadius: {
        'organic': '12px 18px 14px 16px',  // Slightly irregular, hand-drawn feel
        'soft': '16px',                      // Friendly rounded
        'blob': '48% 52% 60% 40% / 50% 60% 40% 50%',  // Organic blob shape
      },
      fontFamily: {
        'display': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'sans': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'playfair': ['var(--font-playfair)', 'serif'],
        'lora': ['var(--font-lora)', 'serif'],
      },
      backgroundImage: {
        'paper-texture': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03' /%3E%3C/svg%3E\")",
        'linen': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M0 0h4v4H0zm4 4h4v4H4z' fill='%237B8A72' fill-opacity='0.02'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
export default config 