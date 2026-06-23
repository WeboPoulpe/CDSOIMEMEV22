"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_LINKS } from "./sidebar";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-40 border-b border-primary/10 bg-card/80 backdrop-blur md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-serif text-lg text-foreground">CD soi-même</span>
        <Link href="/admin/clientes/new" className="text-sm text-primary">+ Cliente</Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {ADMIN_LINKS.map((l) => {
          const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-foreground/65 hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" /> {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
