import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEuros(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(euros);
}

export function formatDateRange(start: Date, end: Date): string {
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${format(start, "d MMMM yyyy, HH:mm", { locale: fr })} – ${format(end, "HH:mm", { locale: fr })}`;
  }
  return `${format(start, "d MMM yyyy HH:mm", { locale: fr })} → ${format(end, "d MMM yyyy HH:mm", { locale: fr })}`;
}
