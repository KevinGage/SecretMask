import "./globals.css";

export const metadata = {
  title: "SecretMask",
  description: "Mask and unmask secrets in text safely.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
