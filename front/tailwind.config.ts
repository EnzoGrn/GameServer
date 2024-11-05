import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {},
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    themes: [{
      "woohp": {
        "color-scheme"     : "light",
        "primary"          : "#f9af03",
        "primary-content"  : "#000025",
        "secondary"        : "#0196ed",
        "secondary-content": "#f7ffff",
        "base-100"         : "#fb7e7e"
      }
    }]
  }
};

export default config;
