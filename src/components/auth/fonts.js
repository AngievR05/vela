import localFont from "next/font/local";

export const authDisplay = localFont({
  src: "../../styles/fonts/cormorant-garamond-600.ttf",
  weight: "600", style: "normal", display: "swap", variable: "--auth-font-display",
});

export const authBody = localFont({
  src: [
    { path: "../../styles/fonts/geist-400.ttf", weight: "400", style: "normal" },
    { path: "../../styles/fonts/geist-500.ttf", weight: "500", style: "normal" },
    { path: "../../styles/fonts/geist-600.ttf", weight: "600", style: "normal" },
  ],
  display: "swap", variable: "--auth-font-body",
});
