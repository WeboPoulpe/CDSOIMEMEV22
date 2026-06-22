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
