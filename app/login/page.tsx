import { LoginForm } from "./login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { theme } from "@/lib/theme";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm rounded-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl">{theme.business.name}</CardTitle>
          <p className="text-sm text-foreground/60">Connectez-vous à votre espace</p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
