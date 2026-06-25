import type { Locale } from "@/contexts/LocaleContext";

export function formatHomeEyebrow(locale: Locale, date: Date) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long"
  })
    .format(date)
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function formatLiveDate(locale: Locale, date: Date) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short"
  })
    .format(date)
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
