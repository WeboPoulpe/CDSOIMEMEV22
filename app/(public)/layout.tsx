import Link from "next/link";
import { theme } from "@/lib/theme";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
              {initials(theme.business.name)}
            </span>
            <span className="font-display text-lg font-semibold">{theme.business.name}</span>
          </Link>
          <Link
            href="/#espaces"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Réserver
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-foreground">{theme.business.name}</span>
          <span>{theme.business.tagline}</span>
        </div>
      </footer>
    </div>
  );
}
