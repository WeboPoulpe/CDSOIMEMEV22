"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveEmailMessages, type EmailMessages } from "@/lib/emails-settings";

export async function saveEmailMessagesAction(messages: EmailMessages): Promise<{ error?: string }> {
  await requireAdmin();
  if (Object.values(messages).some((m) => !m.subject.trim())) {
    return { error: "Chaque email doit avoir un objet." };
  }
  await saveEmailMessages(messages);
  revalidatePath("/admin/emails");
  return {};
}
