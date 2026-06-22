import type { CSSProperties, ReactNode } from "react";

/** Human label per resource type (also used by cards/pages). */
export const TYPE_LABELS: Record<string, string> = {
  COWORKING: "Coworking",
  MEETING_ROOM: "Salle de réunion",
  EVENT_SPACE: "Espace événementiel",
  OFFICE: "Bureau privatif",
};

/** Short word printed large & faint inside the scene panel. */
const SCENE_WORD: Record<string, string> = {
  COWORKING: "Cowork",
  MEETING_ROOM: "Réunion",
  EVENT_SPACE: "Réception",
  OFFICE: "Bureau",
};

/** Per-type light accent, sourced from theme vars (re-skin safe). */
const SCENE_ACCENT: Record<string, string> = {
  COWORKING: "var(--secondary)",
  MEETING_ROOM: "var(--primary)",
  EVENT_SPACE: "var(--primary)",
  OFFICE: "var(--muted-foreground)",
};

/**
 * The "atelier" panel: deep warm wood + a beam of light + the type word in
 * oversized faint display type. Pure presentational, safe in server components.
 */
export function ResourceScene({
  type,
  image,
  className = "",
  children,
}: {
  type: string;
  image?: string;
  className?: string;
  children?: ReactNode;
}) {
  const accent = SCENE_ACCENT[type] ?? "var(--primary)";
  return (
    <div
      className={`scene relative overflow-hidden ${className}`}
      style={{ "--scene-accent": accent } as CSSProperties}
    >
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {/* legibility overlay so chips/labels stay readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/25 to-transparent" />
        </>
      ) : (
        <span className="scene-label pointer-events-none absolute -bottom-3 left-5 select-none font-bold">
          {SCENE_WORD[type] ?? ""}
        </span>
      )}
      {children}
    </div>
  );
}
