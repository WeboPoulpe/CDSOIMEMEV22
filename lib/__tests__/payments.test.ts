import { describe, it, expect, beforeEach } from "vitest";
import { paymentPublicUrl, checkoutUrls, newPaymentToken, shouldMarkSimPaid } from "@/lib/payments";

describe("payment URLs", () => {
  beforeEach(() => { process.env.NEXTAUTH_URL = "http://localhost:3000"; });
  it("builds the public /regler URL from the token", () => {
    expect(paymentPublicUrl("abc")).toBe("http://localhost:3000/regler/abc");
  });
  it("builds success/cancel URLs", () => {
    const { successUrl, cancelUrl } = checkoutUrls("abc");
    expect(successUrl).toBe("http://localhost:3000/regler/abc?status=success");
    expect(cancelUrl).toBe("http://localhost:3000/regler/abc?status=cancel");
  });
});

describe("newPaymentToken", () => {
  it("returns a url-safe token of decent length", () => {
    const t = newPaymentToken();
    expect(t.length).toBeGreaterThanOrEqual(20);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("is unique across calls", () => {
    expect(newPaymentToken()).not.toBe(newPaymentToken());
  });
});

describe("shouldMarkSimPaid (sim/real safety boundary)", () => {
  it("true for a pending simulated session returning success", () => {
    expect(shouldMarkSimPaid({ status: "pending", stripe_session_id: "sim_123" }, "success")).toBe(true);
  });
  it("FALSE for a real Stripe session returning success (webhook is source of truth)", () => {
    expect(shouldMarkSimPaid({ status: "pending", stripe_session_id: "cs_test_abc" }, "success")).toBe(false);
  });
  it("false when already paid", () => {
    expect(shouldMarkSimPaid({ status: "paid", stripe_session_id: "sim_123" }, "success")).toBe(false);
  });
  it("false when not returning success", () => {
    expect(shouldMarkSimPaid({ status: "pending", stripe_session_id: "sim_123" }, "cancel")).toBe(false);
  });
  it("false when no session id yet", () => {
    expect(shouldMarkSimPaid({ status: "pending", stripe_session_id: null }, "success")).toBe(false);
  });
});
