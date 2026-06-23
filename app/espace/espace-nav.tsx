"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/espace", label: "Accueil" },
  { href: "/espace/reserver", label: "Prendre RDV" },
  { href: "/espace/questionnaire", label: "Questionnaire" },
  { href: "/espace/documents", label: "Documents" },
  { href: "/espace/messagerie", label: "Messagerie" },
];

export function EspaceNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {NAV.map((n) => {
        const active = n.href === "/espace" ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground/65 hover:bg-muted"
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
