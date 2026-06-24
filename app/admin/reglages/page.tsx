import { requireAdmin } from "@/lib/auth";
import { getPraticienneProfile } from "@/lib/praticienne";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function ReglagesPage() {
  await requireAdmin();
  const p = await getPraticienneProfile();
  return (
    <div>
      <PageHeader title="Réglages" subtitle="Ton profil et tes informations légales." />
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
