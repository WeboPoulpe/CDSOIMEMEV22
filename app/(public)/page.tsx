import Link from "next/link";
import { Sparkles, Heart, Leaf, Footprints } from "lucide-react";

const prestations = [
  {
    icon: Footprints,
    title: "Réflexologie",
    text: "Une approche corporelle douce pour soutenir l'équilibre du corps, libérer les tensions et accompagner ce qui a besoin de se dénouer.",
  },
  {
    icon: Heart,
    title: "Libération émotionnelle",
    text: "Un massage profond du ventre suivi d'un bain sonore, pour relâcher ce que le corps a retenu, parfois depuis longtemps.",
  },
  {
    icon: Leaf,
    title: "Massage bien-être",
    text: "Un massage unique, adapté à l'instant, guidé par l'écoute de ton corps et de ses besoins.",
  },
  {
    icon: Sparkles,
    title: "Coaching psycho-émotionnel",
    text: "Un accompagnement pour mettre du sens sur ce que tu traverses et avancer avec plus de conscience et d'alignement.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="aura-wrap" aria-hidden="true">
          <div className="aura-blob aura-1" />
          <div className="aura-blob aura-2" />
          <div className="aura-blob aura-3" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-5 py-28 text-center sm:py-36">
          <p className="eyebrow">Réflexologie · Énergétique · Naturopathie</p>
          <h1 className="mt-6 font-serif text-4xl leading-[1.1] tracking-tight text-foreground sm:text-6xl">
            Un espace pour se poser,
            <br />
            souffler et <em className="italic text-primary">mieux se comprendre</em>.
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg text-foreground/65">
            Ici, il n'y a rien à réussir. Tu es accueillie telle que tu es — à ton rythme, en
            toute sécurité.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/reserver"
              className="rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
            >
              Prendre rendez-vous
            </Link>
            <Link href="#accompagnements" className="text-sm font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline">
              Découvrir les accompagnements
            </Link>
          </div>
        </div>
      </section>

      {/* À propos */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <span className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-muted font-serif text-2xl text-[#B98A2E]">
          CD
        </span>
        <p className="eyebrow">Faire connaissance</p>
        <p className="mt-4 font-serif text-2xl leading-relaxed text-foreground/85 sm:text-[1.7rem]">
          Je suis Charline. J'accompagne les femmes qui ressentent le besoin de se déposer, de
          s'écouter et de se reconnecter à elles-mêmes.
        </p>
        <p className="mx-auto mt-5 max-w-xl text-foreground/60">
          Un espace sans jugement, fait de douceur, d'écoute et de sécurité — où tu choisis de
          prendre soin de toi.
        </p>
      </section>

      {/* Accompagnements */}
      <section id="accompagnements" className="scroll-mt-20 bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Mes accompagnements</p>
            <h2 className="mt-3 font-serif text-3xl text-foreground sm:text-4xl">
              Chaque chemin se construit avec toi
            </h2>
            <p className="mt-3 text-foreground/60">
              En respectant ton histoire, ton rythme et tes besoins du moment.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {prestations.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="group rounded-[1.75rem] border border-primary/10 bg-card/70 p-8 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/25"
                >
                  <span className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-serif text-xl text-foreground">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/60">{p.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative isolate overflow-hidden">
        <div className="aura-wrap" aria-hidden="true">
          <div className="aura-blob aura-2" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl px-5 py-24 text-center">
          <div className="hairline-gold mx-auto mb-8 h-px w-24" />
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">
            Prête à prendre soin de toi ?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-foreground/60">
            Choisis un créneau qui te convient ; je te recontacte pour confirmer notre rendez-vous.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/reserver"
              className="rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"
            >
              Prendre rendez-vous
            </Link>
            <Link href="/login" className="text-sm font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline">
              J'ai déjà un espace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
