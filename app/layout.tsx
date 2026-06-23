import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, Fraunces } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "@/components/cookie-banner";
import { theme, themeToCssVars } from "@/lib/theme";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});
const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: theme.business.name,
  description: theme.business.tagline,
  openGraph: {
    title: theme.business.name,
    description: theme.business.tagline,
    images: ["/og-image.jpg"],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cssVars = themeToCssVars(theme) as React.CSSProperties;
  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${serif.variable}`}>
      <body style={cssVars} className="bg-background text-foreground font-body antialiased">
        {children}
        <CookieBanner />
        <Toaster />
      </body>
    </html>
  );
}
