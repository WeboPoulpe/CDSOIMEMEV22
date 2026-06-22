import { z } from "zod";

export const resourceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug : minuscules, chiffres, tirets"),
  type: z.enum(["COWORKING", "MEETING_ROOM", "EVENT_SPACE", "OFFICE"]),
  description: z.string().optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1),
  requiresValidation: z.coerce.boolean(),
  active: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().default(0),
});

export const pricingSchema = z.object({
  id: z.string().optional(),
  resourceId: z.string().min(1),
  unit: z.enum(["HOUR", "HALF_DAY", "DAY", "MONTH"]),
  priceCents: z.coerce.number().int().min(0),
  label: z.string().optional().or(z.literal("")),
});

export type ResourceInput = z.infer<typeof resourceSchema>;
export type PricingInput = z.infer<typeof pricingSchema>;
