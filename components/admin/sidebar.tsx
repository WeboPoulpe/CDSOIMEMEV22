"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarRange, Users, Inbox, CalendarDays, Sparkles, Clock, LogOut, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/admin/actions";

export const ADMIN_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Aperçu", icon: LayoutDashboard },
  { href: "/admin/calendrier", label: "Calendrier", icon: CalendarRange },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/demandes", label: "Demandes", icon: Inbox },
  { href: "/admin/seances", label: "Séances", icon: CalendarDays },
  { href: "/admin/prestations", label: "Prestations", icon: Sparkles },
  { href: "/admin/horaires", label: "Horaires", icon: Clock },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex h-full flex-col p-5">
      <div className="px-2">
        <div className="font-serif text-xl tracking-tight text-foreground">CD soi-même</div>
        <div className="eyebrow mt-1">Espace praticienne</div>
        <div className="hairline-gold mt-4 h-px w-12 opacity-60" />
      </div>

      <div className="mt-6 flex flex-1 flex-col gap-1">
        {ADMIN_LINKS.map((l) => {
          const active = isActive(pathname, l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              {l.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-muted/50 p-3">
        <div className="flex items-center gap-3 px-1">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 font-serif text-sm text-primary">
            {(userName || "C").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{userName || "Charline"}</p>
            <p className="truncate text-xs text-foreground/50">Praticienne</p>
          </div>
        </div>
        <form action={logoutAction} className="mt-2">
          <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-background hover:text-foreground">
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </form>
      </div>
    </nav>
  );
}
