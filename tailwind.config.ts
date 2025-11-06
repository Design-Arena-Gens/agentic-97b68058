import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#050b1a",
        neon: {
          lime: "#a8ff60",
          cyan: "#5fdcff",
          magenta: "#ff7bff"
        }
      },
      fontFamily: {
        display: ["'Rajdhani'", "sans-serif"],
        body: ["'Inter'", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
