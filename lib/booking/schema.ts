import { z } from "zod";

export const reservationInputSchema = z
  .object({
    resourceId: z.string().min(1),
    unit: z.enum(["HOUR", "HALF_DAY", "DAY", "MONTH"]),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    customerName: z.string().min(2, "Nom requis"),
    customerEmail: z.string().email("Email invalide"),
    customerPhone: z.string().optional().or(z.literal("")),
    company: z.string().optional().or(z.literal("")),
    message: z.string().optional().or(z.literal("")),
  })
  .refine((d) => d.endAt > d.startAt, {
    message: "La fin doit être après le début.",
    path: ["endAt"],
  })
  .refine((d) => d.startAt.getTime() > Date.now() - 60_000, {
    message: "Le créneau doit être dans le futur.",
    path: ["startAt"],
  })
  // 60s grace period: intentional tolerance for clock skew and "book now" edge cases
  ;

export type ReservationInput = z.infer<typeof reservationInputSchema>;
