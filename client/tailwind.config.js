/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Om Muruga Olympia Fitness design tokens
        void: "#000000",
        surface: "#111111",
        light: "#ffffff",
        blood: "#d20a0a",
      },
      fontFamily: {
        display: ["Oswald", "Bebas Neue", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "pulse-red": "pulse-red 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
