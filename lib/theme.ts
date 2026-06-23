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
    name: "CD soi-même",
    logo: "/logo.webp",
    tagline:
      "Un lieu ressource pour prendre rendez-vous avec vous-même, à votre rythme, en toute sécurité.",
  },
  colors: {
    background: "#FBF5F3", // crème rosé
    foreground: "#3A2A33", // prune profond
    primary: "#B14A78",    // rose framboise
    secondary: "#9C6B8E",  // mauve
    muted: "#F2E6EC",      // rose pâle
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
