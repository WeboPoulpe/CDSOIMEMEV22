import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/admin/sidebar";
import { MobileNav } from "@/components/admin/mobile-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "praticienne") redirect("/espace");

  const userName = session.user.name || (session.user.email ? session.user.email.split("@")[0] : "Charline");

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-muted/40 via-background to-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-primary/10 bg-card/50 backdrop-blur md:block">
        <Sidebar userName={userName} />
      </aside>
      <div className="min-w-0 flex-1">
        <MobileNav />
        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
