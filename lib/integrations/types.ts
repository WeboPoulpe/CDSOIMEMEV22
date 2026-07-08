export type EmailAttachment = { name: string; contentBase64: string };

export type EmailMessage = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  attachment?: EmailAttachment;
};

export interface EmailService {
  send(msg: EmailMessage): Promise<{ id: string; simulated: boolean }>;
}

export type CalendarEvent = {
  summary: string;
  description?: string;
  startAt: Date;
  endAt: Date;
};

export interface CalendarService {
  createEvent(evt: CalendarEvent): Promise<{ id: string; simulated: boolean }>;
}

export type CheckoutParams = {
  amountCents: number;
  currency: string;
  label: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export type CheckoutSession = { id: string; url: string; simulated: boolean };

export type WebhookOutcome =
  | { status: "ignored" }                                              // simulated mode, or a valid but irrelevant event
  | { status: "invalid" }                                              // signature verification failed or secret missing
  | { status: "fulfill"; paymentId: string; paymentIntent?: string };  // a paid checkout to record

export interface PaymentService {
  createCheckoutSession(p: CheckoutParams): Promise<CheckoutSession>;
  /** Synchronous: verifies the Stripe signature on the RAW body. */
  verifyWebhook(rawBody: string, signature: string | null): WebhookOutcome;
}
