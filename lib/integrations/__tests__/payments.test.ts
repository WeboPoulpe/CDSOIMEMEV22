import { describe, it, expect, beforeEach } from "vitest";
import { getPaymentService, toAmountCents, parseCheckoutCompleted } from "@/lib/integrations/payments";

describe("toAmountCents", () => {
  it("converts euro decimals to integer cents", () => {
    expect(toAmountCents("60")).toBe(6000);
    expect(toAmountCents("60.5")).toBe(6050);
    expect(toAmountCents(49.99)).toBe(4999);
  });
  it("returns 0 for null/invalid", () => {
    expect(toAmountCents(null)).toBe(0);
    expect(toAmountCents("abc")).toBe(0);
  });
});

describe("getPaymentService (demo mode)", () => {
  beforeEach(() => {
    process.env.DEMO_MODE = "true";
    process.env.STRIPE_SECRET_KEY = "";
  });
  it("returns a simulated service that yields a sim_ session pointing at successUrl", async () => {
    const svc = getPaymentService();
    const s = await svc.createCheckoutSession({
      amountCents: 6000, currency: "eur", label: "Séance",
      successUrl: "http://localhost:3000/regler/abc?status=success",
      cancelUrl: "http://localhost:3000/regler/abc",
      metadata: { paymentId: "p1" },
    });
    expect(s.simulated).toBe(true);
    expect(s.id.startsWith("sim_")).toBe(true);
    expect(s.url).toBe("http://localhost:3000/regler/abc?status=success");
  });
  it("verifyWebhook returns ignored in simulated mode", () => {
    expect(getPaymentService().verifyWebhook("{}", null)).toEqual({ status: "ignored" });
  });
  it("returns the REAL Stripe service when a key is set, regardless of DEMO_MODE", () => {
    process.env.DEMO_MODE = "true";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "";
    // Real service short-circuits to "invalid" when the webhook secret is absent
    // (no network call); the simulated service would return "ignored" instead.
    expect(getPaymentService().verifyWebhook("{}", null)).toEqual({ status: "invalid" });
  });
});

describe("parseCheckoutCompleted", () => {
  it("extracts paymentId + payment_intent on a paid completed session", () => {
    const r = parseCheckoutCompleted({
      type: "checkout.session.completed",
      data: { object: { payment_status: "paid", metadata: { paymentId: "p1" }, payment_intent: "pi_1" } },
    });
    expect(r).toEqual({ paymentId: "p1", paymentIntent: "pi_1" });
  });
  it("returns null when payment_status is not paid", () => {
    expect(parseCheckoutCompleted({
      type: "checkout.session.completed",
      data: { object: { payment_status: "unpaid", metadata: { paymentId: "p1" } } },
    })).toBeNull();
  });
  it("returns null for other event types", () => {
    expect(parseCheckoutCompleted({ type: "payment_intent.created" })).toBeNull();
  });
  it("returns null when paymentId metadata is missing", () => {
    expect(parseCheckoutCompleted({ type: "checkout.session.completed", data: { object: { payment_status: "paid" } } })).toBeNull();
  });
});
