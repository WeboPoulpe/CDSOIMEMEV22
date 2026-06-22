import Link from "next/link";
import { theme } from "@/lib/theme";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-primary/8 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/" className="font-serif text-xl tracking-tight text-foreground">
            {theme.business.name}
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/reserver" className="hidden text-foreground/70 transition-colors hover:text-foreground sm:inline">
              Prendre rendez-vous
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-primary/30 px-4 py-1.5 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Mon espace
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-primary/8">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-10 text-sm text-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-serif text-base text-foreground">{theme.business.name}</span>
          <span>Réflexologie · Énergétique · Naturopathie — Sainte-Savine</span>
        </div>
      </footer>
    </div>
  );
}
