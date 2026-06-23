import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { logoutAction } from "./actions";
import { EspaceNav } from "./espace-nav";

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "cliente") redirect("/admin");

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-muted/40 via-background to-background">
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-card/70 backdrop-blur">
        <div className="mx-auto w-full max-w-4xl px-5 py-3.5">
          <div className="flex items-center justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt={theme.business.name} className="h-9 w-auto" />
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">Partir en douceur</Button>
            </form>
          </div>
          <div className="mt-2.5">
            <EspaceNav />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
