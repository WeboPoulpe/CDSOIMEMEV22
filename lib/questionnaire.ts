import { prisma } from "@/lib/db";

export type QFieldType = "text" | "textarea";
export type QField = { id: string; label: string; type: QFieldType };
export type QDef = { title: string; intro: string; fields: QField[] };

const KEY = "questionnaire";

export const DEFAULT_QUESTIONNAIRE: QDef = {
  title: "Questionnaire d'accueil",
  intro:
    "Prends un moment pour répondre à ces quelques questions. Il n'y a pas de bonne ou de mauvaise réponse — écris simplement ce qui te vient.",
  fields: [
    { id: "f_raison", label: "Qu'est-ce qui t'amène ? (raison du rendez-vous)", type: "textarea" },
    { id: "f_objectif", label: "Quel est ton objectif ?", type: "textarea" },
    { id: "f_causes", label: "Selon toi, quelles en sont les causes ?", type: "textarea" },
    { id: "f_consequences", label: "Quelles conséquences cela a-t-il sur ta vie ?", type: "textarea" },
    { id: "f_obstacles", label: "Quels obstacles rencontres-tu ?", type: "textarea" },
    { id: "f_ressources", label: "Sur quelles ressources peux-tu t'appuyer ?", type: "textarea" },
    { id: "f_besoins", label: "De quoi as-tu besoin ?", type: "textarea" },
    { id: "f_echeance", label: "Échéance souhaitée", type: "text" },
  ],
};

function sanitize(value: unknown): QDef {
  const v = (value ?? {}) as Partial<QDef>;
  const fields = Array.isArray(v.fields) ? v.fields : [];
  return {
    title: typeof v.title === "string" && v.title.trim() ? v.title : DEFAULT_QUESTIONNAIRE.title,
    intro: typeof v.intro === "string" ? v.intro : DEFAULT_QUESTIONNAIRE.intro,
    fields: fields
      .filter((f): f is QField => !!f && typeof f.label === "string")
      .map((f, i) => ({
        id: typeof f.id === "string" && f.id ? f.id : `f_${i}`,
        label: f.label,
        type: f.type === "text" ? "text" : "textarea",
      })),
  };
}

export async function getQuestionnaire(): Promise<QDef> {
  const row = await prisma.app_settings.findUnique({ where: { key: KEY } });
  if (!row) return DEFAULT_QUESTIONNAIRE;
  const def = sanitize(row.value);
  return def.fields.length ? def : DEFAULT_QUESTIONNAIRE;
}

const LEGACY: [string, string][] = [
  ["raison_rdv", "Raison du rendez-vous"],
  ["objectif", "Objectif"],
  ["causes", "Causes"],
  ["consequences", "Conséquences"],
  ["obstacles", "Obstacles"],
  ["ressources", "Ressources"],
  ["besoins", "Besoins"],
  ["echeance", "Échéance"],
];

/** Normalised {label, value} list from a form_responses row (JSON answers or legacy columns). */
export function answersOf(fr: Record<string, unknown>): { label: string; value: string }[] {
  if (Array.isArray(fr.answers)) {
    return (fr.answers as Array<{ label?: unknown; value?: unknown }>)
      .filter((a) => a && a.value)
      .map((a) => ({ label: String(a.label ?? ""), value: String(a.value ?? "") }));
  }
  return LEGACY.map(([k, label]) => ({ label, value: (fr[k] as string) ?? "" })).filter((x) => x.value);
}

export async function saveQuestionnaire(def: QDef): Promise<void> {
  const clean = sanitize(def);
  await prisma.app_settings.upsert({
    where: { key: KEY },
    create: { key: KEY, value: clean as object, updated_at: new Date() },
    update: { value: clean as object, updated_at: new Date() },
  });
}
