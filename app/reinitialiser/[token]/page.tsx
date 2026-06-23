import Link from "next/link";
import { theme } from "@/lib/theme";
import { getResetTokenEmail } from "@/lib/password-reset";
import { ResetForm } from "./reset-form";

export const dynamic = "force-dynamic";

export default async function ReinitialiserPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const email = await getResetTokenEmail(token);

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="aura-wrap" aria-hidden="true">
        <div className="aura-blob aura-1" />
        <div className="aura-blob aura-3" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="surface-soft rounded-[1.75rem] p-8 shadow-xl shadow-primary/5">
          <div className="text-center">
            <p className="font-serif text-2xl tracking-tight text-foreground">{theme.business.name}</p>
            <p className="mt-1 text-sm text-foreground/55">
              {email ? "Choisis ton mot de passe" : "Lien de réinitialisation"}
            </p>
          </div>
          <div className="mt-7">
            {email ? (
              <ResetForm token={token} />
            ) : (
              <div className="space-y-3 text-sm">
                <p className="text-red-600">Ce lien est invalide ou a expiré.</p>
                <Link href="/mot-de-passe" className="inline-block text-primary hover:underline">
                  Demander un nouveau lien
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
