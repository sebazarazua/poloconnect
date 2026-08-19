export type EffectiveMatchStatus = "upcoming" | "live" | "finished" | "cancelled";

// A match has no daemon flipping its status at the scheduled time, so the
// effective status is derived here from scheduledAt/endsAt on every read.
// Admins never set "cancelled"/"finished" directly (cancel = delete the match,
// postpone = edit scheduledAt/endsAt); those raw values only exist for legacy
// data and, if present, always win over the time-based calculation.
export function computeEffectiveMatchStatus(match: { status: string; scheduledAt: Date | string; endsAt?: Date | string | null }): EffectiveMatchStatus {
  if (match.status === "cancelled") return "cancelled";
  if (match.status === "finished") return "finished";

  const now = Date.now();
  if (match.endsAt && now > new Date(match.endsAt).getTime()) return "finished";
  if (now >= new Date(match.scheduledAt).getTime()) return "live";
  return "upcoming";
}

// Same start/end time window logic, for entities (like SpotlightEvent) that
// only care about a boolean "is it live right now", not the full match lifecycle.
export function isWithinLiveWindow(scheduledAt: Date | string, endsAt?: Date | string | null): boolean {
  const now = Date.now();
  if (now < new Date(scheduledAt).getTime()) return false;
  if (endsAt && now > new Date(endsAt).getTime()) return false;
  return true;
}
