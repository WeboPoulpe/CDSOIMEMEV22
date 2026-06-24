import { requireAdmin } from "@/lib/auth";
import { getPraticienneProfile } from "@/lib/praticienne";
import { getActiveMantra } from "@/lib/mantra";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { SettingsForm } from "./settings-form";
import { MantraForm } from "./mantra-form";

export const dynamic = "force-dynamic";

export default async function ReglagesPage() {
  await requireAdmin();
  const [p, mantra] = await Promise.all([getPraticienneProfile(), getActiveMantra()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Réglages" subtitle="Ton profil et tes informations légales." />

      <SectionCard title="Mantra du moment">
        <p className="mb-3 text-sm text-foreground/55">Affiché en haut de l'espace de tes clientes.</p>
        <MantraForm initial={mantra ?? ""} />
      </SectionCard>

      <SettingsForm
        initial={{
          nom_praticienne: p.nom_praticienne ?? "Charline",
          forme_juridique: p.forme_juridique ?? "",
          siret: p.siret ?? "",
          adresse_entreprise: p.adresse_entreprise ?? "",
          telephone: p.telephone ?? "",
          email: p.email ?? "",
          photo_profil: p.photo_profil ?? "",
          logo_praticienne: p.logo_praticienne ?? "",
        }}
      />
    </div>
  );
}
