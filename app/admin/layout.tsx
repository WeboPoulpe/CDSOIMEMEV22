import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { theme } from "@/lib/theme";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "praticienne") redirect("/espace");

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-muted bg-card md:block">
        <Sidebar businessName={theme.business.name} />
      </aside>
      <div className="flex-1">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
