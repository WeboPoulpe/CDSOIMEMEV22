/**
 * RE-SKINNING — READ BEFORE EDITING
 *
 * The brand color values below are the CANONICAL reference for this app's
 * visual identity.  However, Tailwind v4 utility classes (bg-primary, text-secondary,
 * etc.) resolve through shadcn's CSS-custom-property chain defined in
 * `app/globals.css` `:root` at BUILD TIME — NOT from this TypeScript object at
 * runtime.  `themeToCssVars` only injects inline styles onto <body> for
 * components that read the color-* CSS vars directly.
 *
 * To re-skin the app you MUST edit BOTH:
 *   1. This file  (the TS object below)
 *   2. The brand `:root` block in `app/globals.css`
 *
 * CSS variable ↔ theme property mirror:
 *   --primary               ↔  colors.primary
 *   --secondary             ↔  colors.secondary
 *   --muted                 ↔  colors.muted
 *   --background            ↔  colors.background
 *   --card  (= background)  ↔  colors.background   ← update card/popover too
 *   --popover (= background)↔  colors.background   ← update card/popover too
 *   --foreground            ↔  colors.foreground
 *   --radius                ↔  radius
 */
export const theme = {
  business: {
    name: "La Grange Lyotaine",
    logo: "/logo.svg",
    tagline: "Un lieu chaleureux pour travailler, se réunir et créer.",
  },
  colors: {
    background: "#F7F4EF", // pierre / sable clair
    foreground: "#1F1B16", // encre profonde
    primary: "#B4502E",    // terracotta / bois
    secondary: "#7C8B6B",  // vert sauge
    muted: "#EAE4DB",      // surface secondaire
  },
  fonts: {
    display: "Bricolage Grotesque",
    body: "DM Sans",
  },
  radius: "1rem",
} as const;

export type Theme = typeof theme;

export function themeToCssVars(t: Theme): Record<string, string> {
  return {
    "--color-background": t.colors.background,
    "--color-foreground": t.colors.foreground,
    "--color-primary": t.colors.primary,
    "--color-secondary": t.colors.secondary,
    "--color-muted": t.colors.muted,
    "--radius": t.radius,
  };
}
