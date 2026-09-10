export function mercadoPagoPaymentIdFromUrl(url?: string) {
  if (!url) return undefined;
  try {
    const params = new URL(url).searchParams;
    return params.get("payment_id") ?? params.get("collection_id") ?? undefined;
  } catch {
    return undefined;
  }
}

export function marketPaymentReturnRoute(productId: string, returnedUrl?: string) {
  const paymentId = mercadoPagoPaymentIdFromUrl(returnedUrl);
  const query = new URLSearchParams({ productId });
  if (paymentId) query.set("paymentId", paymentId);
  return `/market-publish-return?${query.toString()}` as const;
}
