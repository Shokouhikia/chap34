/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#12143a",
        purple: "#6c4cf1",
        "purple-deep": "#4a2fd1",
        "purple-tint": "#f1edfe",
        ink: "#1a1a2e",
        muted: "#6d6e88",
        line: "#e7e4f4",
        success: "#1fa971",
      },
      fontFamily: {
        vazir: ["var(--font-vazir)", "sans-serif"],
      },
      borderRadius: {
        lg2: "28px",
        md2: "18px",
      },
    },
  },
  plugins: [],
};
