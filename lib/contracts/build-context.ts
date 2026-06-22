import type { Reservation, Resource, Settings } from "@prisma/client";
import { formatEuros } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const UNIT_LABELS: Record<string, string> = {
  HOUR: "à l'heure", HALF_DAY: "à la demi-journée", DAY: "à la journée", MONTH: "au mois",
};

export function buildMergeContext(args: {
  reservation: Reservation;
  resource: Resource;
  settings: Settings | null;
}): Record<string, string> {
  const { reservation: r, resource, settings } = args;
  const fmt = (d: Date) => format(d, "d MMMM yyyy 'à' HH:mm", { locale: fr });
  return {
    client_nom: r.customerName,
    client_email: r.customerEmail,
    societe: r.company ?? "",
    espace: resource.name,
    date_debut: fmt(r.startAt),
    date_fin: fmt(r.endAt),
    unite: UNIT_LABELS[r.unit] ?? r.unit,
    montant: formatEuros(r.totalCents),
    nom_lieu: settings?.businessName ?? "Le lieu",
    adresse_lieu: settings?.address ?? "",
  };
}
