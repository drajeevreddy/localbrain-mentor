import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#000000",
        "primary-active": "#1a1a1a",
        "text-link": "#0d74ce",
        ink: "#171717",
        body: "#60646c",
        "body-strong": "#171717",
        muted: "#999999",
        "muted-soft": "#cccccc",
        hairline: "#f0f0f3",
        "hairline-soft": "#f5f5f7",
        "hairline-strong": "#dcdee0",
        canvas: "#ffffff",
        "canvas-soft": "#fafafa",
        "surface-card": "#ffffff",
        "surface-strong": "#f0f0f3",
        "surface-dark": "#171717",
        "on-primary": "#ffffff",
        "on-dark": "#ffffff",
        "on-dark-soft": "#b0b4ba",
        "accent-warning": "#ab6400",
        "accent-preview": "#8145b5",
        "semantic-error": "#eb8e90",
        "semantic-success": "#16a34a",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        none: "0px",
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        xxl: "24px",
        pill: "9999px",
      },
      spacing: {
        xxs: "4px",
        xs: "8px",
        sm: "12px",
        base: "16px",
        md: "20px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
        section: "96px",
      },
    },
  },
  plugins: [],
};

export default config;
