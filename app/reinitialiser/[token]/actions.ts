"use server";

import { redirect } from "next/navigation";
import { resetPasswordWithToken } from "@/lib/password-reset";

export async function resetPasswordAction(
  token: string,
  password: string,
  confirm: string
): Promise<{ error?: string }> {
  if (password !== confirm) return { error: "Les mots de passe ne correspondent pas." };
  const res = await resetPasswordWithToken(token, password);
  if (res.error) return { error: res.error };
  redirect("/login");
}
