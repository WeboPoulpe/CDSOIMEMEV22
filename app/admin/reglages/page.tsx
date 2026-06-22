import { prisma } from "@/lib/db";
import { SettingsForm } from "./settings-form";
import { ResetDemoButton } from "./reset-button";

export default async function ReglagesPage() {
  const settings = await prisma.settings.findFirst();
  const demo = process.env.DEMO_MODE === "true";
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-display text-3xl">Réglages</h1>
      <SettingsForm settings={settings} />
      {demo && (
        <div className="space-y-2 rounded-lg border border-muted p-4">
          <h2 className="font-display text-lg">Mode démo</h2>
          <p className="text-sm text-foreground/60">Rejoue le jeu de données « La Grange Lyotaine ». À utiliser avant une présentation.</p>
          <ResetDemoButton />
        </div>
      )}
    </div>
  );
}
