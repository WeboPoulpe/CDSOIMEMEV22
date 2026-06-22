import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { logoutAction } from "./actions";

const nav = [
  { href: "/espace", label: "Accueil" },
  { href: "/espace/documents", label: "Documents" },
  { href: "/espace/messagerie", label: "Messagerie" },
];

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "cliente") redirect("/admin");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-muted bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <span className="font-display text-lg font-semibold">{theme.business.name}</span>
            <nav className="hidden gap-4 text-sm sm:flex">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="text-foreground/70 hover:text-foreground">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">Partir en douceur</Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
