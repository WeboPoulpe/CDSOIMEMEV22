import { Badge } from "@/components/ui/badge";

export function PaymentBadge({ status }: { status: string }) {
  if (status === "PAID") {
    return <Badge className="bg-secondary text-secondary-foreground">Payée</Badge>;
  }
  return <Badge variant="outline">En attente de paiement</Badge>;
}
