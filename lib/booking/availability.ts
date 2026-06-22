export function overlaps(
  a: { startAt: Date; endAt: Date },
  b: { startAt: Date; endAt: Date }
): boolean {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

export function isSlotAvailable(params: {
  capacity: number;
  activeCount: number;
  closed: boolean;
}): boolean {
  if (params.closed) return false;
  return params.activeCount < params.capacity;
}
