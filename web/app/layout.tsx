import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Nav } from "@/components/Nav";

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
      <body>
        <header className="border-b border-border bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-text hover:text-accent transition shrink-0"
            >
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="font-semibold tracking-tight">Insights</span>
            </Link>
            <Nav />
            <div className="text-xs text-muted hidden md:block">Gemini 2.5 Flash</div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
