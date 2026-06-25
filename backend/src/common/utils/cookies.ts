export function parseCookieHeader(header?: string) {
  const result: Record<string, string> = {};
  if (!header) return result;

  const pairs = header.split(";");
  for (const pair of pairs) {
    const [rawKey, ...rest] = pair.trim().split("=");
    if (!rawKey || rest.length === 0) continue;
    result[rawKey] = decodeURIComponent(rest.join("="));
  }

  return result;
}
