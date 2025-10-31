/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // 复古像素风格色彩（仅用于特定场景）
        retro: {
          bg: {
            dark: '#1a1b26',
            darker: '#16161e',
          },
          text: '#c0caf5',
          textMuted: '#565f89',
          border: '#414868',
          red: '#ff5c57',
          orange: '#ff9e3b',
          yellow: '#f9f871',
          green: '#5af78e',
          blue: '#57c7ff',
          purple: '#c74ded',  // ⚠️ 不推荐使用（用户反馈：看吐了）
          pink: '#ff6ac1',    // ⚠️ 不推荐使用（用户反馈：看吐了）
          cyan: '#9aedfe',
        },
        // 📌 推荐配色方案（参考 DESIGN_SYSTEM.md）
        // 主色调：使用 Tailwind 默认的 cyan-* 和 teal-* 类
        // 强调色：orange-*, emerald-*
        // 背景：gray-950, gray-900, gray-800
        // 禁止：purple-*, pink-*, violet-*, retro-purple, retro-pink
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // keyframes: {
      //   "accordion-down": {
      //     from: { height: "0" },
      //     to: { height: "var(--radix-accordion-content-height)" },
      //   },
      //   "accordion-up": {
      //     from: { height: "var(--radix-accordion-content-height)" },
      //     to: { height: "0" },
      //   },
      //   "fadeIn": {
      //     "0%": { opacity: "0" },
      //     "100%": { opacity: "1" }
      //   },
      //   "slideUp": {
      //     "0%": { opacity: "0", transform: "translateY(20px)" },
      //     "100%": { opacity: "1", transform: "translateY(0)" }
      //   },
      //   "fade-in": {
      //     "0%": { opacity: "0", transform: "scale(0.95)" },
      //     "100%": { opacity: "1", transform: "scale(1)" }
      //   },
      //   "pixel-glow": {
      //     "0%, 100%": { boxShadow: "0 0 20px rgba(199, 77, 237, 0.3)" },
      //     "50%": { boxShadow: "0 0 30px rgba(199, 77, 237, 0.6), 0 0 40px rgba(255, 106, 193, 0.3)" }
      //   }
      // },
      // animation: {
      //   "accordion-down": "accordion-down 0.2s ease-out",
      //   "accordion-up": "accordion-up 0.2s ease-out",
      //   "fadeIn": "fadeIn 0.3s ease-out",
      //   "slideUp": "slideUp 0.4s ease-out",
      //   "fade-in": "fade-in 0.2s ease-out",
      //   "pixel-glow": "pixel-glow 2s ease-in-out infinite"
      // },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'monospace'],
        'retro': ['"VT323"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
    },
  },
  plugins: [],
}