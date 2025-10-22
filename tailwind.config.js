/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        background: "var(--background)",
        "background-80": "rgba(var(--background-rgb), 0.8)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        border: "var(--border)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        "navy-900": "#0B0F19",
        "navy-800": "#101421",
        "navy-700": "#1A2333",
        "navy-accent": "#22304A",
        "navy-soft": "#2B3954",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
      },
      fontFamily: {
        inter: ['"InterVariable"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
