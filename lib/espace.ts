import { prisma } from "@/lib/db";

/**
 * The cliente's domain identity is her `profiles` row, linked to the auth user
 * via `auth_user_id`. Every /espace query scopes on the returned profile id —
 * never on a client-supplied id.
 */
export async function currentClienteProfile(authUserId: string) {
  return prisma.profiles.findFirst({ where: { auth_user_id: authUserId } });
}
