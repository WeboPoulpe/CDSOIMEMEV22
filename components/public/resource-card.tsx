import Link from "next/link";
import { formatEuros } from "@/lib/utils";
import { ResourceScene, TYPE_LABELS } from "@/components/public/resource-scene";

type ResourceCardProps = {
  slug: string;
  name: string;
  type: string;
  description: string | null;
  requiresValidation: boolean;
  fromPriceCents: number | null;
  image?: string;
};

export function ResourceCard(p: ResourceCardProps) {
  return (
    <Link href={`/reserver/${p.slug}`} className="group block">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        <ResourceScene
          type={p.type}
          image={p.image}
          className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03]"
        >
          <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
            <span className="eyebrow eyebrow--light">{TYPE_LABELS[p.type] ?? p.type}</span>
            <span
              className={`rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${
                p.requiresValidation
                  ? "chip-glass"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {p.requiresValidation ? "Sur demande" : "Réservation immédiate"}
            </span>
          </div>
        </ResourceScene>

        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="font-display text-xl leading-tight">{p.name}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
          <div className="mt-auto flex items-end justify-between pt-3">
            {p.fromPriceCents != null ? (
              <p className="text-sm">
                <span className="text-muted-foreground">dès </span>
                <span className="font-display text-lg">{formatEuros(p.fromPriceCents)}</span>
              </p>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-transform duration-300 group-hover:translate-x-0.5">
              Réserver
              <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
