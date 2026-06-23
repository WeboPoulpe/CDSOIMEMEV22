import Link from "next/link";
import { theme } from "@/lib/theme";
import { RequestForm } from "./request-form";

export default function MotDePassePage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="aura-wrap" aria-hidden="true">
        <div className="aura-blob aura-1" />
        <div className="aura-blob aura-2" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm text-foreground/55 transition-colors hover:text-foreground">
          ← Retour à la connexion
        </Link>
        <div className="surface-soft rounded-[1.75rem] p-8 shadow-xl shadow-primary/5">
          <div className="text-center">
            <p className="font-serif text-2xl tracking-tight text-foreground">{theme.business.name}</p>
            <p className="mt-1 text-sm text-foreground/55">Définir ou réinitialiser ton mot de passe</p>
          </div>
          <div className="mt-7">
            <RequestForm />
          </div>
        </div>
      </div>
    </main>
  );
}
