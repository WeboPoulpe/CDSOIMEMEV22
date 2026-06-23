import { requireAdmin } from "@/lib/auth";
import { getEmailMessages } from "@/lib/emails-settings";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { EmailEditor } from "./email-editor";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  await requireAdmin();
  const messages = await getEmailMessages();

  const demo = process.env.DEMO_MODE === "true";
  const hasKey = !!process.env.BREVO_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim() || "cdsoimeme@gmail.com";

  return (
    <div>
      <PageHeader title="Emails" subtitle="Personnalise les messages envoyés automatiquement." />

      <div className="space-y-6">
        <SectionCard title="Configuration">
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <span className="text-foreground/55">Mode d'envoi :</span>
              {demo
                ? <Badge variant="secondary">Simulé (démo)</Badge>
                : hasKey
                  ? <Badge>Réel via Brevo</Badge>
                  : <Badge variant="outline">Non configuré</Badge>}
            </p>
            <p><span className="text-foreground/55">Adresse expéditeur :</span> {from}</p>
            {demo && (
              <p className="text-foreground/55">
                En mode démo, les emails ne sont pas envoyés (ils sont simulés). Passe <code>DEMO_MODE=false</code> et autorise l'IP du serveur chez Brevo pour activer l'envoi réel.
              </p>
            )}
          </div>
        </SectionCard>

        <EmailEditor initial={messages} />
      </div>
    </div>
  );
}
