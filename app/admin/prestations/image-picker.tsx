"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

const MAX_DIM = 1000;

async function downscale(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function ImagePicker({ name, initial }: { name: string; initial?: string }) {
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            setValue(await downscale(file));
          } finally {
            setBusy(false);
          }
        }}
      />

      {value ? (
        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-primary/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Aperçu" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => setValue("")}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-foreground/55 text-white backdrop-blur hover:bg-foreground/75"
            aria-label="Retirer la photo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/25 text-foreground/50 transition-colors hover:border-primary/40 hover:text-foreground/70"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-sm">{busy ? "Traitement…" : "Ajouter une photo"}</span>
        </button>
      )}
      {value && (
        <button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-primary hover:underline">
          Changer la photo
        </button>
      )}
    </div>
  );
}
