// Argentina uses a fixed UTC-3 offset year-round (no daylight saving since 2009),
// so we can convert to/from it with simple arithmetic instead of a timezone library.
const ARGENTINA_OFFSET_MINUTES = 3 * 60;

/** Splits a UTC Date into the date/time strings an admin would type in Argentina local time. */
export function toArgentinaDateTimeInputs(date: Date) {
  const local = new Date(date.getTime() - ARGENTINA_OFFSET_MINUTES * 60000);
  return {
    date: local.toISOString().slice(0, 10),
    time: local.toISOString().slice(11, 16)
  };
}

/** Builds a real UTC Date from a date/time pair typed by an admin as Argentina local time. */
export function fromArgentinaDateTimeInputs(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00.000-03:00`);
}
