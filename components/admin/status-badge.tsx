import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-amber-500 text-white" },
  CONFIRMED: { label: "Confirmée", className: "bg-secondary text-white" },
  REJECTED: { label: "Refusée", className: "bg-red-500 text-white" },
  CANCELLED: { label: "Annulée", className: "bg-gray-400 text-white" },
  COMPLETED: { label: "Passée", className: "bg-foreground/70 text-white" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, className: "" };
  return <Badge className={s.className}>{s.label}</Badge>;
}
