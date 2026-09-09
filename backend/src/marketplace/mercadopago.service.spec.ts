import { ConfigService } from "@nestjs/config";
import { MercadoPagoService } from "./mercadopago.service";

describe("Mercado Pago full refunds", () => {
  const service = new MercadoPagoService(new ConfigService({ MP_ACCESS_TOKEN: "test-token" }));
  afterEach(() => jest.restoreAllMocks());

  it("uses the Payments refunds API with a full refund and stable idempotency key", async () => {
    const request = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      id: 42, payment_id: 123, status: "approved", amount: 100
    }), { status: 201 }));
    await expect(service.refundPayment("123", "listing-refund-record")).resolves.toEqual({ id: "42", status: "approved", amount: 100 });
    expect(request).toHaveBeenCalledWith("https://api.mercadopago.com/v1/payments/123/refunds", expect.objectContaining({
      method: "POST", body: "{}", signal: expect.any(AbortSignal),
      headers: expect.objectContaining({ Authorization: "Bearer test-token", "X-Idempotency-Key": "listing-refund-record" })
    }));
  });

  it("reports provider rejection instead of confirming a refund", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 400 }));
    await expect(service.refundPayment("123", "key")).rejects.toThrow("HTTP 400");
  });

  it("handles a lost response as unconfirmed and retryable", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("Connection closed"));
    await expect(service.refundPayment("123", "key")).rejects.toThrow("No se pudo confirmar");
  });

  it("rejects a response for another payment", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: 42, payment_id: 999, status: "approved", amount: 100 })));
    await expect(service.refundPayment("123", "key")).rejects.toThrow("inválida");
  });
});
