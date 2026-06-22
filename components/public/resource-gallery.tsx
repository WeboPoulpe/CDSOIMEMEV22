"use client";

import { useState } from "react";
import { ResourceScene, TYPE_LABELS } from "@/components/public/resource-scene";

export function ResourceGallery({
  type,
  images,
  requiresValidation,
}: {
  type: string;
  images: string[];
  requiresValidation: boolean;
}) {
  const [active, setActive] = useState(0);
  const main = images[active];

  return (
    <div className="space-y-3">
      <ResourceScene type={type} image={main} className="aspect-[16/10] w-full rounded-2xl">
        <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-2">
          <span className="eyebrow eyebrow--light">{TYPE_LABELS[type] ?? type}</span>
          <span
            className={`rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${
              requiresValidation ? "chip-glass" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {requiresValidation ? "Sur demande" : "Réservation immédiate"}
          </span>
        </div>
      </ResourceScene>

      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`aspect-[4/3] w-20 overflow-hidden rounded-lg border-2 transition ${
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
