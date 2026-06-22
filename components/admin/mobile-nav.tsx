"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { buttonVariants } from "@/components/ui/button";

export function MobileNav({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between border-b border-muted bg-card px-4 py-3 md:hidden">
      <span className="font-display text-lg font-semibold">{businessName}</span>
      <Sheet open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
        <SheetTrigger
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          ☰ Menu
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div onClick={() => setOpen(false)}>
            <Sidebar businessName={businessName} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
