import "./globals.css";

export const metadata = {
  title: {
    default: "Vela",
    template: "%s | Vela",
  },
  description:
    "A transparent AI-driven reading companion for organising books, understanding Reading DNA and choosing what to read next.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
