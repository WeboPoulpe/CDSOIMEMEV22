"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/calendrier", label: "Calendrier" },
  { href: "/admin/reservations", label: "Réservations" },
  { href: "/admin/espaces", label: "Espaces" },
  { href: "/admin/contrats", label: "Modèle de contrat" },
  { href: "/admin/fermetures", label: "Fermetures" },
  { href: "/admin/reglages", label: "Réglages" },
];

export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-4 px-2 font-display text-lg font-semibold">{businessName}</div>
      {links.map((l) => {
        const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {l.label}
          </Link>
        );
      })}
      <form action={logoutAction} className="mt-auto">
        <Button type="submit" variant="ghost" className="w-full justify-start">
          Déconnexion
        </Button>
      </form>
    </nav>
  );
}
