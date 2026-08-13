export type ContentTarget =
  | { kind: "none" }
  | { kind: "external"; url: string }
  | { kind: "shop"; brandId: string };

const shopTargetPattern = /^app:shop\/([a-zA-Z0-9-]+)$/;

export function buildShopTarget(brandId: string) {
  return `app:shop/${brandId}`;
}

export function parseContentTarget(targetUrl?: string | null): ContentTarget {
  const normalizedTarget = targetUrl?.trim();

  if (!normalizedTarget) {
    return { kind: "none" };
  }

  const shopMatch = normalizedTarget.match(shopTargetPattern);
  if (shopMatch) {
    return { kind: "shop", brandId: shopMatch[1] };
  }

  return { kind: "external", url: normalizedTarget };
}