import Link from "next/link";
import { Sparkles, Quote } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/display";
import { getPraticienneProfile } from "@/lib/praticienne";
import { getForfaits } from "@/lib/forfaits";
import { getTemoignages } from "@/lib/temoignages";

export const dynamic = "force-dynamic";

const VALUES = ["Douceur", "Écoute", "Sécurité"];

export default async function HomePage() {
  const [prestations, prat, forfaits, temoignages] = await Promise.all([
    prisma.care_types.findMany({
      where: { actif: true },
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
      select: { id: true, nom: true, description: true, duree_minutes: true, prix: true, image_url: true },
    }),
    getPraticienneProfile(),
    getForfaits(),
    getTemoignages(),
  ]);
  const charlinePhoto = prat.photo_profil || "/photos/charline-portrait-plantes.webp";

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="aura-wrap" aria-hidden="true">
          <div className="aura-blob aura-1" />
          <div className="aura-blob aura-2" />
          <div className="aura-blob aura-3" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <p className="eyebrow">Réflexologie · Énergétique · Naturopathie</p>
            <h1 className="mt-6 font-serif text-4xl leading-[1.08] tracking-tight text-foreground sm:text-6xl">
              Un espace pour se poser, souffler et <em className="italic text-primary">mieux se comprendre</em>.
            </h1>
            <p className="mt-7 max-w-lg text-lg text-foreground/65">
              Ici, il n'y a rien à réussir. Tu es accueillie telle que tu es — à ton rythme, en
              toute sécurité.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/reserver" className="rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">
                Prendre rendez-vous
              </Link>
              <Link href="#accompagnements" className="text-sm font-medium text-foreground/70 underline-offset-4 hover:text-foreground hover:underline">
                Découvrir les accompagnements
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm text-foreground/55">
              {VALUES.map((v, i) => (
                <span key={v} className="flex items-center gap-3">
                  {i > 0 && <span className="h-1 w-1 rounded-full bg-[#C9A24B]" />}
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] shadow-2xl shadow-primary/15 ring-1 ring-primary/15">
              <video
                className="aspect-[4/5] h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                poster="/charline.svg"
              >
                <source src="/video/tu_peux_faire_un_mix_des_deux.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="absolute -bottom-4 left-6 rounded-full bg-card/90 px-5 py-2.5 text-sm font-medium text-foreground shadow-lg ring-1 ring-primary/10 backdrop-blur">
              Sainte-Savine · sur rendez-vous
            </div>
          </div>
        </div>
      </section>

      {/* À propos */}
      <section className="border-y border-primary/10 bg-muted/60 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 sm:grid-cols-[0.8fr_1.2fr]">
          <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-full ring-1 ring-primary/20 shadow-lg shadow-primary/10 sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={charlinePhoto} alt="Charline" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="eyebrow">Faire connaissance</p>
            <p className="mt-4 font-serif text-2xl leading-relaxed text-foreground/85 sm:text-[1.7rem]">
              Je suis Charline. J'accompagne les femmes qui ressentent le besoin de se déposer, de
              s'écouter et de se reconnecter à elles-mêmes.
            </p>
            <p className="mt-4 text-foreground/60">
              Un espace sans jugement, fait de douceur, d'écoute et de sécurité — où tu choisis de
              prendre soin de toi.
            </p>
          </div>
        </div>
      </section>

      {/* Accompagnements (dynamiques) */}
      <section id="accompagnements" className="scroll-mt-20 bg-background py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Mes accompagnements</p>
            <h2 className="mt-3 font-serif text-3xl text-foreground sm:text-4xl">Chaque chemin se construit avec toi</h2>
            <p className="mt-3 text-foreground/60">En respectant ton histoire, ton rythme et tes besoins du moment.</p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {prestations.map((p) => (
              <div key={p.id} className="group overflow-hidden rounded-[1.75rem] border border-primary/10 bg-card/80 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.nom} className="h-44 w-full object-cover" />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-[#F2D9E4] via-[#EAD7E6] to-[#F4E6CF]">
                    <Sparkles className="h-7 w-7 text-primary/50" />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="font-serif text-xl text-foreground">{p.nom}</h3>
                  {p.description && <p className="mt-2 text-sm leading-relaxed text-foreground/60">{p.description}</p>}
                  <div className="mt-4 flex items-center justify-between border-t border-primary/8 pt-4 text-sm">
                    <span className="text-foreground/60">{p.duree_minutes ?? 60} min · <span className="font-medium text-primary">{formatPrice(p.prix)}</span></span>
                    <Link href="/reserver" className="font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">Réserver →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Forfaits */}
      {forfaits.length > 0 && (
        <section className="border-t border-primary/10 bg-muted/40 py-20">
          <div className="mx-auto max-w-5xl px-5">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Aller plus loin</p>
              <h2 className="mt-3 font-serif text-3xl text-foreground sm:text-4xl">Mes forfaits d'accompagnement</h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-3">
              {forfaits.map((f, i) => (
                <div key={i} className="flex flex-col rounded-[1.75rem] border border-primary/10 bg-card/80 p-7 backdrop-blur-sm">
                  <h3 className="font-serif text-xl text-foreground">{f.nom}</h3>
                  {f.nbSeances && <p className="mt-1 text-sm text-primary">{f.nbSeances}</p>}
                  {f.description && <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/60">{f.description}</p>}
                  {f.prix && <p className="mt-4 border-t border-primary/8 pt-4 font-medium text-foreground">{f.prix}</p>}
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/reserver" className="rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">
                Prendre rendez-vous
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Mon univers */}
      <section className="border-y border-primary/10 bg-secondary/10 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Mon univers</p>
            <h2 className="mt-3 font-serif text-3xl text-foreground sm:text-4xl">Un cocon pour se déposer</h2>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {["bol-tibetain", "cristaux-encens", "reflexologie-close", "huiles-essentielles", "massage-dos-vue", "cymbales-tibetaines"].map((g, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={g}
                src={`/photos/${g}.webp`}
                alt=""
                className={`w-full rounded-2xl object-cover ring-1 ring-primary/10 ${i % 5 === 0 ? "aspect-[4/5]" : "aspect-square"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages */}
      {temoignages.length > 0 && (
        <section className="bg-background py-20">
          <div className="mx-auto max-w-5xl px-5">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Ce qu'elles en disent</p>
              <div className="hairline-gold mx-auto mt-4 h-px w-20 opacity-50" />
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {temoignages.map((t, i) => (
                <figure key={i} className="rounded-[1.5rem] border border-primary/10 bg-card/80 p-6 shadow-sm backdrop-blur-sm">
                  <Quote className="h-5 w-5 text-primary/40" />
                  <blockquote className="mt-3 font-serif text-lg leading-snug text-foreground/85">« {t.quote} »</blockquote>
                  <figcaption className="mt-4 text-sm text-foreground/55">— {t.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA final */}
      <section className="relative isolate overflow-hidden border-t border-primary/10 bg-muted/50">
        <div className="aura-wrap" aria-hidden="true">
          <div className="aura-blob aura-2" />
        </div>
        <div className="relative z-10 mx-auto max-w-2xl px-5 py-24 text-center">
          <h2 className="font-serif text-3xl text-foreground sm:text-4xl">Prête à prendre soin de toi ?</h2>
          <p className="mx-auto mt-4 max-w-md text-foreground/60">
            Choisis un créneau qui te convient ; je te recontacte pour confirmer notre rendez-vous.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link href="/reserver" className="rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5">
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
