import Link from "next/link";
import { Sparkles, Heart, Leaf, Footprints } from "lucide-react";
import { theme } from "@/lib/theme";

const prestations = [
  {
    icon: Footprints,
    title: "Réflexologie",
    text: "Une approche corporelle douce pour soutenir l'équilibre du corps, libérer les tensions et accompagner les déséquilibres physiques et émotionnels.",
  },
  {
    icon: Heart,
    title: "Massage de libération émotionnelle",
    text: "Un massage profond et enveloppant du ventre suivi d'un bain sonore qui permet au corps de relâcher ce qui a été retenu, parfois depuis longtemps.",
  },
  {
    icon: Leaf,
    title: "Massage bien-être",
    text: "Un massage unique, adapté à l'instant, guidé par l'écoute du corps et de ses besoins.",
  },
  {
    icon: Sparkles,
    title: "Coaching de vie psycho-émotionnel",
    text: "Un accompagnement pour mettre du sens sur ce que vous traversez, comprendre vos fonctionnements et avancer avec plus de conscience et d'alignement.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
          Réflexologie · Énergétique · Naturopathie
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-5xl">
          Bienvenue dans l'univers de {theme.business.name}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-foreground/70 sm:text-lg">
          {theme.business.tagline}
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-base text-foreground/60">
          Ici, vous choisissez de vous écouter, de vous reconnecter à votre corps, à vos
          émotions et à ce qui fait sens pour vous.
        </p>
        <div className="mt-8">
          <Link
            href="/reserver"
            className="inline-block rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Prendre rendez-vous
          </Link>
        </div>
      </section>

      {/* Prestations */}
      <section className="grid gap-6 sm:grid-cols-2">
        {prestations.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="rounded-2xl bg-card p-7 text-center shadow-sm ring-1 ring-muted"
            >
              <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-muted text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
                {p.title}
              </h2>
              <p className="mt-3 text-sm text-foreground/65">{p.text}</p>
            </div>
          );
        })}
      </section>

      {/* Portals */}
      <section className="text-center">
        <h2 className="font-display text-2xl">Chaque accompagnement est unique.</h2>
        <p className="mx-auto mt-2 max-w-xl text-foreground/65">
          Il se construit avec Vous, en respectant Votre histoire, Votre rythme et Vos
          besoins du moment.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-full border border-primary px-7 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Espace Praticienne
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Espace Client
          </Link>
        </div>
      </section>
    </div>
  );
}
