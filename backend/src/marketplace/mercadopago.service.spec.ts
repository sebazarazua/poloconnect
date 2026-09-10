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

  it("searches payment attempts by the server external reference", async () => {
    const request = jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      results: [{ id: 123, status: "approved", external_reference: "record", transaction_amount: 100, currency_id: "ARS" }]
    })));

    await expect(service.findPaymentsByExternalReference("record")).resolves.toEqual([{
      id: "123", status: "approved", externalReference: "record", transactionAmount: 100, currencyId: "ARS"
    }]);
    expect(request.mock.calls[0][0]).toContain("/v1/payments/search?");
    expect(request.mock.calls[0][0]).toContain("external_reference=record");
  });

  it("reloads the stored Checkout Pro preference", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({
      id: "pref-1", init_point: "https://mercadopago.test/checkout", external_reference: "record"
    })));

    await expect(service.getPreference("pref-1")).resolves.toEqual({
      id: "pref-1", initPoint: "https://mercadopago.test/checkout", externalReference: "record"
    });
  });
});
