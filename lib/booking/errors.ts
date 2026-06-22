export class SlotUnavailableError extends Error {
  constructor(message = "Ce créneau n'est plus disponible.") {
    super(message);
    this.name = "SlotUnavailableError";
  }
}
