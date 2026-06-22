/**
 * Allowed values for `seances.type` — mirrors the DB check constraint
 * `seances_type_check`. Keep in sync if the constraint changes.
 */
export const SEANCE_TYPES = [
  "Réflexologie",
  "Massage de libération émotionnelle",
  "Massage Bien-être - Intuitif",
  "Massage Bien-être - Chi Nei Tsang",
  "Coaching psychoémotionnel - 1ère séance",
  "Coaching psychoémotionnel - Suivi",
  "corps",
  "coeur",
  "esprit",
] as const;

export type SeanceType = (typeof SEANCE_TYPES)[number];
