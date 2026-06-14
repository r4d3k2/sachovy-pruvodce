/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        accent: "var(--accent)",
        good: "var(--good)",
        bad: "var(--bad)",
        "text-strong": "var(--text-strong)",
        "text-soft": "var(--text-soft)",
        "text-muted": "var(--text-muted)",
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        body: ['"Crimson Text"', "serif"],
        mono: ['"Noto Serif"', "serif"],
      },
    },
  },
  plugins: [],
};
