/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {

      /* ================= COLORS ================= */
      colors: {
        busBlue: "#2563EB",
        busYellow: "#FFD93D",
        busPink: "#FF7AC6",
        busMint: "#4ADE80",

        ink: "#1F2937",
        paper: "#FFFDF7",
      },


      /* ================= FONTS (playful look) ================= */
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui"],
      },


      /* ================= SHADOWS (comic style) ================= */
      boxShadow: {
        comic: "6px 6px 0px #000",
        comicSm: "4px 4px 0px #000",
      },


      /* ================= BORDER WIDTH (thick cartoon borders) ================= */
      borderWidth: {
        3: "3px",
        4: "4px",
      },


      /* ================= BORDER RADIUS (chunky cards) ================= */
      borderRadius: {
        xl2: "18px",
        xl3: "24px",
      },
    },
  },

  plugins: [],
};
