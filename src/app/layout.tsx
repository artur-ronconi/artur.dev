import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import "@/styles/globals.css";
import { PointerGlow } from "@/components/site/pointer-glow";
import { siteUrl } from "@/lib/env";
import { THEME_COLOR, THEME_INIT_SCRIPT } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Artur Hamann Ronconi · Engenheiro de Software",
    template: "%s · Artur.dev",
  },
  description:
    "Portfólio de engenharia de software: backend com Node.js e TypeScript, AWS, DevOps e arquitetura de sistemas distribuídos.",
  authors: [{ name: "Artur Hamann Ronconi" }],
  openGraph: { type: "website", locale: "pt_BR", siteName: "Artur.dev" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR.dark,
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/* Aplica o tema antes da primeira pintura e marca que há JS (ver lib/theme.ts). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <PointerGlow />
      </body>
    </html>
  );
}
