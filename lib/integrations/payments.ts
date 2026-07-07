import type {
  PaymentService,
  CheckoutParams,
  CheckoutSession,
  StripeWebhookResult,
} from "@/lib/integrations/types";

/** Euro Decimal/number/string → integer cents. Returns 0 when not parseable. */
export function toAmountCents(prix: unknown): number {
  const n = typeof prix === "number" ? prix : parseFloat(String(prix ?? ""));
  if (!isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

/** Pure: pull our paymentId + payment_intent out of a Stripe event shape. */
export function parseCheckoutCompleted(event: {
  type: string;
  data?: { object?: { metadata?: Record<string, string> | null; payment_intent?: string | null } };
}): { paymentId: string; paymentIntent?: string } | null {
  if (event.type !== "checkout.session.completed") return null;
  const obj = event.data?.object;
  const paymentId = obj?.metadata?.paymentId;
  if (!paymentId) return null;
  const pi = obj?.payment_intent;
  return { paymentId, paymentIntent: pi ?? undefined };
}

// ───────── Simulated service (demo / no API key) ─────────

class SimulatedPaymentService implements PaymentService {
  async createCheckoutSession(p: CheckoutParams): Promise<CheckoutSession> {
    // No real charge: send the user straight to the success URL.
    return { id: `sim_${Date.now()}`, url: p.successUrl, simulated: true };
  }
  verifyWebhook(): StripeWebhookResult | null {
    return null; // webhook path is unused without real Stripe
  }
}

// ───────── Real Stripe service ─────────

class StripePaymentService implements PaymentService {
  constructor(private secretKey: string, private webhookSecret: string) {}

  private client() {
    // Lazy import keeps the SDK out of the simulated path / edge bundles.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require("stripe");
    return new Stripe(this.secretKey);
  }

  async createCheckoutSession(p: CheckoutParams): Promise<CheckoutSession> {
    const stripe = this.client();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: p.currency,
            unit_amount: p.amountCents,
            product_data: { name: p.label },
          },
        },
      ],
      metadata: p.metadata,
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
    });
    return { id: session.id, url: session.url as string, simulated: false };
  }

  verifyWebhook(rawBody: string, signature: string | null): StripeWebhookResult | null {
    if (!signature || !this.webhookSecret) return null;
    const stripe = this.client();
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      return null; // bad signature
    }
    const parsed = parseCheckoutCompleted(event);
    if (!parsed) return { type: event.type };
    return { type: event.type, paymentId: parsed.paymentId, paymentIntent: parsed.paymentIntent };
  }
}

// ───────── Selector ─────────

export function getPaymentService(): PaymentService {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  const demo = process.env.DEMO_MODE === "true";
  if (!key || demo) return new SimulatedPaymentService();
  return new StripePaymentService(key, process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "");
}
