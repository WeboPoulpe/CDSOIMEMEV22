"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateResourceImagesAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ImagesManager({
  resourceId,
  initialImages,
}: {
  resourceId: string;
  initialImages: string[];
}) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function persist(next: string[]) {
    setSaving(true);
    const r = await updateResourceImagesAction(resourceId, next);
    setSaving(false);
    if (r?.error) {
      toast.error(r.error);
      return;
    }
    setImages(next);
    router.refresh();
    toast.success("Galerie mise à jour.");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl">Galerie photos</h2>
        <p className="text-sm text-muted-foreground">
          La première photo sert de visuel principal. Collez des URLs d&apos;images publiques.
        </p>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-medium text-primary-foreground">
                  Principale
                </span>
              )}
              <button
                type="button"
                onClick={() => persist(images.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 rounded-full bg-foreground/70 px-2 py-0.5 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100"
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aucune photo pour le moment.</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = url.trim();
          if (!v) return;
          persist([...images, v]);
          setUrl("");
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="min-w-[16rem] flex-1">
          <label className="block text-xs">URL de l&apos;image</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/photo.jpg"
            type="url"
          />
        </div>
        <Button type="submit" disabled={saving}>
          Ajouter
        </Button>
      </form>
    </div>
  );
}
