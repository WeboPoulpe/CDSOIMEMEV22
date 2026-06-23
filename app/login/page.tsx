import Link from "next/link";
import { LoginForm } from "./login-form";
import { theme } from "@/lib/theme";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-foreground">
      {/* Lateral login sheet */}
      <div className="sheet-in relative z-10 flex w-full flex-col justify-center bg-background px-6 py-10 shadow-2xl shadow-black/30 sm:px-10 md:w-[30rem] md:shrink-0">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-foreground/55 transition-colors hover:text-foreground">
            ← Retour à l'accueil
          </Link>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt={theme.business.name} className="h-14 w-auto" />
          <p className="mt-4 text-foreground/55">Connecte-toi à ton espace.</p>
          <div className="hairline-gold mt-5 h-px w-16 opacity-50" />

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-5 text-sm">
            <Link href="/mot-de-passe" className="text-primary/80 underline-offset-4 hover:text-primary hover:underline">
              Mot de passe oublié ou première connexion ?
            </Link>
          </p>

          <p className="mt-10 text-xs text-foreground/40">
            Un espace pour se poser, souffler et mieux se comprendre.
          </p>
        </div>
      </div>

      {/* Video panel (right) */}
      <div className="relative hidden flex-1 overflow-hidden md:block">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/charline.svg"
        >
          <source src="/video/tu_peux_faire_un_mix_des_deux.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-transparent to-foreground/10" />
        <div className="absolute bottom-10 left-10 right-10">
          <p className="font-serif text-3xl leading-snug text-white drop-shadow-lg">
            Réflexologie · Énergétique · Naturopathie
          </p>
          <p className="mt-2 max-w-md text-white/80 drop-shadow">
            Prends rendez-vous avec toi-même, à ton rythme, en toute sécurité.
          </p>
        </div>
      </div>
    </main>
  );
}
