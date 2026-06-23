"use server";

import { requestPasswordReset } from "@/lib/password-reset";

export async function requestPasswordResetAction(email: string): Promise<{ ok: boolean; demoLink?: string }> {
  return requestPasswordReset(email);
}
