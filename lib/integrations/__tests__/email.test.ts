import { describe, it, expect, beforeEach } from "vitest";
import { getEmailService } from "@/lib/integrations/email";

describe("getEmailService", () => {
  beforeEach(() => {
    process.env.DEMO_MODE = "true";
    process.env.BREVO_API_KEY = "";
  });

  it("returns a simulated service in demo mode", async () => {
    const svc = getEmailService({ fromEmail: "x@y.fr", fromName: "Test" });
    const res = await svc.send({ to: "a@b.fr", subject: "Hi", html: "<p>hi</p>" });
    expect(res.simulated).toBe(true);
  });
});
