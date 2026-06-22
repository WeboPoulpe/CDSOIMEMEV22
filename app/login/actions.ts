"use server";

import { signIn } from "@/lib/auth";
import { loginSchema } from "@/lib/auth-schema";
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
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/admin",
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Email ou mot de passe incorrect." };
    }
    throw e; // redirect throws — laisser remonter
  }
  return undefined;
}
