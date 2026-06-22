import { prisma } from "@/lib/db";
import { theme } from "@/lib/theme";
import { ResourceCard } from "@/components/public/resource-card";

export default async function HomePage() {
  const resources = await prisma.resource.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { pricings: { orderBy: { priceCents: "asc" }, take: 1 } },
  });

  return (
    <>
      {/* Hero — the atelier panel: warm wood, beam of light, editorial type */}
      <section
        className="scene mb-16 overflow-hidden rounded-3xl px-7 py-16 sm:px-12 sm:py-24"
        style={{ "--scene-accent": "var(--primary)" } as React.CSSProperties}
      >
        <div className="relative z-10 max-w-2xl">
          <p className="eyebrow eyebrow--light mb-5">Lieu polyvalent · Saint-Lyé</p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] text-primary-foreground sm:text-6xl">
            {theme.business.tagline}
          </h1>
          <p className="mt-5 max-w-lg text-base text-primary-foreground/70 sm:text-lg">
            De la place de coworking à la grande salle de réception — choisissez
            votre espace et réservez en ligne, en quelques clics.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <a
              href="#espaces"
              className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Découvrir les espaces
            </a>
            <span className="text-sm text-primary-foreground/60">
              {resources.length} espaces disponibles
            </span>
          </div>
        </div>
      </section>

      {/* Spaces — type is the structural label */}
      <section id="espaces" className="scroll-mt-24 space-y-7">
        <div>
          <p className="eyebrow mb-2">Nos espaces</p>
          <h2 className="font-display text-2xl sm:text-3xl">Choisissez votre lieu</h2>
        </div>

        {resources.length === 0 ? (
          <p className="text-muted-foreground">Aucun espace disponible pour le moment.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((r) => (
              <ResourceCard
                key={r.id}
                slug={r.slug}
                name={r.name}
                type={r.type}
                description={r.description}
                requiresValidation={r.requiresValidation}
                fromPriceCents={r.pricings[0]?.priceCents ?? null}
                image={r.images?.[0]}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
