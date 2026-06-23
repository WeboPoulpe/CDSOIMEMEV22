import Link from "next/link";
import { prisma } from "@/lib/db";
import { theme } from "@/lib/theme";
import { getQuestionnaire } from "@/lib/questionnaire";
import { DynamicQuestionnaireForm } from "@/components/dynamic-questionnaire-form";
import { submitPublicQuestionnaireAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function QuestionnaireTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [profile, def] = await Promise.all([
    prisma.profiles.findFirst({ where: { account_token: token } }),
    getQuestionnaire(),
  ]);
  const valid = !!profile && !!profile.token_expiration && profile.token_expiration.getTime() > Date.now();

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background px-4 py-12">
      <div className="aura-wrap" aria-hidden="true">
        <div className="aura-blob aura-1" />
        <div className="aura-blob aura-3" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <p className="font-serif text-2xl tracking-tight text-foreground">{theme.business.name}</p>
          <p className="mt-1 text-sm text-foreground/55">{def.title}</p>
        </div>

        <div className="surface-soft rounded-[1.75rem] p-6 shadow-xl shadow-primary/5 sm:p-8">
          {valid ? (
            <>
              {def.intro && <p className="mb-6 text-foreground/65">{def.intro}</p>}
              <DynamicQuestionnaireForm
                fields={def.fields}
                defaults={{
                  prenom: profile?.prenom ?? "",
                  nom: profile?.nom ?? "",
                  email: profile?.email ?? "",
                  telephone: profile?.telephone ?? "",
                }}
                submit={submitPublicQuestionnaireAction.bind(null, token)}
              />
            </>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-red-600">Ce lien est invalide ou a expiré.</p>
              <p className="text-foreground/60">
                Demande un nouveau lien à ta praticienne, ou rends-toi sur la{" "}
                <Link href="/" className="text-primary underline">page d'accueil</Link>.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
