import "./globals.css";
import type { Metadata } from "next";

// Layout raíz — compartido por /login y por el grupo (app). A propósito no tiene nav/header ni
// chequeo de auth acá: el header/nav privado y el guard de sesión viven en
// app/(app)/layout.tsx, para que /login pueda usar este mismo layout sin arrastrar UI ni
// lógica de una sesión que todavía no existe.
export const metadata: Metadata = {
  title: "Insights",
  description: "Google Ads + Search Console + Gemini",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
