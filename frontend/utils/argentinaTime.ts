export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

// Argentina uses a fixed UTC-3 offset year-round (no daylight saving since 2009),
// so the legacy helpers below remain exact for existing admin scheduling flows.
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

export type AdminTimeZoneOption = {
  label: string;
  value: string;
};

export const adminTimeZoneOptions: AdminTimeZoneOption[] = [
  { label: "Argentina", value: ARGENTINA_TIME_ZONE },
  { label: "Uruguay", value: "America/Montevideo" },
  { label: "Chile", value: "America/Santiago" },
  { label: "Brasil", value: "America/Sao_Paulo" },
  { label: "Estados Unidos Este", value: "America/New_York" },
  { label: "Estados Unidos Central", value: "America/Chicago" },
  { label: "Estados Unidos Oeste", value: "America/Los_Angeles" },
  { label: "UTC", value: "UTC" }
];

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour === "24" ? "0" : values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return (zonedAsUtc - date.getTime()) / 60000;
}

export function fromZonedDateTimeInputs(dateStr: string, timeStr: string, timeZone = ARGENTINA_TIME_ZONE): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return new Date(NaN);
  }

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset * 60000);
}

export function toZonedDateTimeInputs(date: Date, timeZone = ARGENTINA_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour === "24" ? "00" : values.hour}:${values.minute}`
  };
}
