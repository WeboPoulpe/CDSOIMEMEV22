import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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

export const metadata: Metadata = {
  title: theme.business.name,
  description: theme.business.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cssVars = themeToCssVars(theme) as React.CSSProperties;
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body style={cssVars} className="bg-background text-foreground font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
