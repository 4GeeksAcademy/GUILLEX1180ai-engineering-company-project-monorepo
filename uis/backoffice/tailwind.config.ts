import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        forest: "#102d27",
        leaf: "#22c55e",
        paper: "#f8fafc",
        ink: "#0f172a",
        coral: "#f97316",
        muted: "#64748b",
      },
    },
  },
  plugins: [],
};

export default config;