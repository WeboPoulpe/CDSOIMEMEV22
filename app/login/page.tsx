import Link from "next/link";
import { LoginForm } from "./login-form";
import { theme } from "@/lib/theme";

export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="aura-wrap" aria-hidden="true">
        <div className="aura-blob aura-1" />
        <div className="aura-blob aura-2" />
        <div className="aura-blob aura-3" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-foreground/55 transition-colors hover:text-foreground"
        >
          ← Retour à l'accueil
        </Link>

        <div className="surface-soft rounded-[1.75rem] p-8 shadow-xl shadow-primary/5">
          <div className="text-center">
            <p className="font-serif text-2xl tracking-tight text-foreground">{theme.business.name}</p>
            <p className="mt-1 text-sm text-foreground/55">Connecte-toi à ton espace</p>
          </div>

          <div className="mt-7">
            <LoginForm />
          </div>

          <p className="mt-5 text-center text-sm">
            <Link href="/mot-de-passe" className="text-primary/80 underline-offset-4 hover:text-primary hover:underline">
              Mot de passe oublié ou première connexion ?
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-foreground/45">
          Un espace pour se poser, souffler et mieux se comprendre.
        </p>
      </div>
    </main>
  );
}
