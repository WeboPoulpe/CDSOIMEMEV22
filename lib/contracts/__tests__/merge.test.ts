import { describe, it, expect } from "vitest";
import { mergeTemplate } from "@/lib/contracts/merge";

describe("mergeTemplate", () => {
  it("replaces simple fields", () => {
    expect(mergeTemplate("Bonjour {{client_nom}}", { client_nom: "Jean" })).toBe("Bonjour Jean");
  });
  it("replaces multiple occurrences", () => {
    expect(mergeTemplate("{{x}}-{{x}}", { x: "a" })).toBe("a-a");
  });
  it("leaves unknown fields empty", () => {
    expect(mergeTemplate("[{{inconnu}}]", {})).toBe("[]");
  });
  it("includes conditional section when value present", () => {
    expect(mergeTemplate("A{{#societe}}, société {{societe}}{{/societe}}.", { societe: "ACME" }))
      .toBe("A, société ACME.");
  });
  it("removes conditional section when value empty", () => {
    expect(mergeTemplate("A{{#societe}}, société {{societe}}{{/societe}}.", { societe: "" }))
      .toBe("A.");
  });
});
