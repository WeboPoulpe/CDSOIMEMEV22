"use server";

import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/auth-schema";
import { prisma } from "@/lib/db";
import { AuthError } from "next-auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Identifiants invalides." };
  }

  // Landing page by role (signIn re-validates the password, so this lookup is safe).
  const user = await prisma.auth_users.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  const roleRow = user
    ? await prisma.user_roles.findFirst({ where: { user_id: user.id }, select: { role: true } })
    : null;
  const redirectTo = roleRow?.role === "praticienne" ? "/admin" : "/espace";

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect." };
    }
    throw e; // redirect throws — laisser remonter
  }
  return undefined;
}
