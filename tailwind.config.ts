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
        'sage-green': '#7B8A72',
        'blood-orange': '#E85A2B',
        'lemon-cream': '#F5E6A8',
        'cream': '#F5F1E8',
      },
      fontFamily: {
        'display': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'sans': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'playfair': ['var(--font-playfair)', 'serif'],
        'lora': ['var(--font-lora)', 'serif'],
      },
    },
  },
  plugins: [],
}
export default config 