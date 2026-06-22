import { requireClient } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EspacePage() {
  await requireClient();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Bienvenue ✨</h1>
        <p className="text-foreground/60">Votre espace de soin et d'accompagnement.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-lg opacity-70">
          <CardHeader>
            <CardTitle className="text-base">Mes prochaines séances</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/50">Bientôt disponible</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg opacity-70">
          <CardHeader>
            <CardTitle className="text-base">Mes documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/50">Bientôt disponible</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
