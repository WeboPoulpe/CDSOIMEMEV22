"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type Tab = { key: string; label: string; badge?: number; content: React.ReactNode };

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 border-b border-primary/10">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={cn(
                "relative px-3.5 py-2.5 text-sm transition-colors",
                on ? "text-primary" : "text-foreground/55 hover:text-foreground"
              )}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-xs", on ? "bg-primary/12 text-primary" : "bg-muted text-foreground/55")}>
                  {t.badge}
                </span>
              )}
              {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
