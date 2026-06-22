import { describe, it, expect } from "vitest";
import { theme, themeToCssVars } from "@/lib/theme";

describe("theme", () => {
  it("exposes business identity", () => {
    expect(theme.business.name).toBe("CD soi-même");
  });
  it("defines the core palette", () => {
    expect(theme.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(theme.colors.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe("themeToCssVars", () => {
  it("maps colors to CSS custom properties", () => {
    const vars = themeToCssVars(theme);
    expect(vars["--color-primary"]).toBe(theme.colors.primary);
    expect(vars["--color-background"]).toBe(theme.colors.background);
  });
});
