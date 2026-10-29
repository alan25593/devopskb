import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Muted text shades lifted to reach WCAG AA (4.5:1) on the dark backgrounds
      // (stock slate-600 was 2.4:1 on slate-900). 500 stays lighter than 600 to keep hierarchy.
      colors: {
        slate: { 500: '#7d8ba1', 600: '#75849a' },
        gray: { 500: '#848e9e', 600: '#7a8494' },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
