import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        voxel: ['"Press Start 2P"', "monospace"],
        neonnoir: ['"Exo 2"', "sans-serif"],
        shinobi: ['"Noto Sans JP"', "sans-serif"],
        aether: ["Orbitron", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
