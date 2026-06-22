import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/admin/sidebar";
import { MobileNav } from "@/components/admin/mobile-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const settings = await prisma.settings.findFirst();
  const businessName = settings?.businessName ?? "Administration";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-muted bg-card md:block">
        <Sidebar businessName={businessName} />
      </aside>
      <div className="flex-1">
        <MobileNav businessName={businessName} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
