import { format } from "date-fns";
import { fr } from "date-fns/locale";

/** Best display name for a cliente profile (falls back to email, then "—"). */
export function clienteName(
  p: { prenom?: string | null; nom?: string | null; email?: string | null } | null | undefined
): string {
  if (!p) return "—";
  const n = [p.prenom, p.nom].filter(Boolean).join(" ").trim();
  return n || p.email || "—";
}

export function formatDateTime(d: Date): string {
  return format(d, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

export function formatDate(d: Date): string {
  return format(d, "d MMMM yyyy", { locale: fr });
}

export function formatPrice(prix: { toString(): string } | number | null | undefined): string {
  if (prix == null) return "—";
  return `${Number(prix).toFixed(0)} €`;
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

/** Labels + badge variants for booking_requests.status. */
export const bookingStatus: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: "En attente", variant: "secondary" },
  confirmed: { label: "Confirmé", variant: "default" },
  refused: { label: "Refusé", variant: "destructive" },
  cancelled: { label: "Annulé", variant: "outline" },
};

export function bookingStatusOf(status: string): { label: string; variant: BadgeVariant } {
  return bookingStatus[status] ?? { label: status, variant: "outline" };
}
