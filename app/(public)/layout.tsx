import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" aria-label="CD soi-même — accueil">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="CD soi-même" className="h-11 w-auto" />
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

      <footer className="border-t border-primary/10 bg-muted/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-10 text-sm text-foreground/55 sm:flex-row sm:justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="CD soi-même" className="h-10 w-auto opacity-90" />
          <span>Réflexologie · Énergétique · Naturopathie — Sainte-Savine</span>
        </div>
      </footer>
    </div>
  );
}
