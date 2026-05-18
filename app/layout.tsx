import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fitbit Air Dashboard",
  description: "Panel de actividad Fitbit con temas personalizables",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Exo+2:wght@400;600;700&family=Noto+Sans+JP:wght@400;700&family=Orbitron:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
