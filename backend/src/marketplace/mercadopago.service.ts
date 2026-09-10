import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";

export type MpPreference = {
  id: string;
  initPoint: string;
  externalReference?: string | null;
};

export type MpPaymentInfo = {
  id: string;
  status: string;
  externalReference: string | null;
  transactionAmount: number | null;
  currencyId: string | null;
};

const MP_API_BASE = "https://api.mercadopago.com";

/**
 * Thin server-to-server client for Mercado Pago's Checkout Pro (Preferences) + Payments APIs.
 * The access token never leaves the backend and is never logged.
 */
@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(private readonly config: ConfigService) {}

  private getAccessToken() {
    return this.config.get<string>("MP_ACCESS_TOKEN", "").trim();
  }

  isConfigured() {
    return Boolean(this.getAccessToken());
  }

  /** Publication fee configured by the backend operator, never sent by the client. */
  getPublicationPriceCents() {
    const pesos = Number(this.config.get<string>("MP_PUBLICATION_PRICE_ARS", "0"));
    return Math.round((Number.isFinite(pesos) && pesos > 0 ? pesos : 0) * 100);
  }

  private getNotificationUrl() {
    const base = this.config.get<string>("PUBLIC_BASE_URL", "").trim().replace(/\/+$/, "");
    if (!base) return undefined;
    const prefix = this.config.get<string>("API_PREFIX", "api/v1").replace(/^\/+/, "").replace(/\/+$/, "");
    return `${base}/${prefix}/marketplace/payments/webhook`;
  }

  async createPreference(params: { externalReference: string; title: string; amountCents: number; currency: string; returnUrl?: string; expiresAt?: Date }): Promise<MpPreference> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new BadRequestException("Mercado Pago is not configured.");
    }

    const notificationUrl = this.getNotificationUrl();
    const backUrl = params.returnUrl;

    const body: Record<string, unknown> = {
      items: [
        {
          title: params.title,
          quantity: 1,
          currency_id: params.currency,
          unit_price: Math.round(params.amountCents) / 100
        }
      ],
      external_reference: params.externalReference,
      notification_url: notificationUrl
    };

    if (params.expiresAt) {
      body.expires = true;
      body.expiration_date_from = new Date().toISOString();
      body.expiration_date_to = params.expiresAt.toISOString();
    }

    if (backUrl) {
      body.back_urls = { success: backUrl, pending: backUrl, failure: backUrl };
      body.auto_return = "approved";
    }

    const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      this.logger.error(`Preference creation failed (${response.status}): ${errorBody}`);
      throw new BadRequestException("No se pudo generar el pago para la publicación.");
    }

    const data = await response.json();
    const initPoint = data.init_point ?? data.sandbox_init_point;
    if (!data.id || !initPoint) {
      this.logger.error(`Preference creation returned an unexpected payload: ${JSON.stringify(data)}`);
      throw new BadRequestException("No se pudo generar el pago para la publicación.");
    }

    return { id: String(data.id), initPoint: String(initPoint) };
  }

  /** Server-to-server lookup. Never trust webhook/body values without this call. */
  async getPayment(paymentId: string): Promise<MpPaymentInfo> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new BadRequestException("Mercado Pago is not configured.");
    }

    const response = await fetch(`${MP_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`, {
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      this.logger.error(`Payment lookup failed (${response.status}): ${errorBody}`);
      throw new BadRequestException("No se pudo verificar el pago.");
    }

    const data = await response.json();
    return {
      id: String(data.id),
      status: String(data.status ?? ""),
      externalReference: data.external_reference ?? null,
      transactionAmount: typeof data.transaction_amount === "number" ? data.transaction_amount : null,
      currencyId: data.currency_id ?? null
    };
  }

  /** Finds every recent payment attempt associated with one server-generated reference. */
  async findPaymentsByExternalReference(externalReference: string): Promise<MpPaymentInfo[]> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new BadRequestException("Mercado Pago is not configured.");
    }

    const query = new URLSearchParams({
      external_reference: externalReference,
      sort: "date_created",
      criteria: "desc",
      limit: "20"
    });
    const response = await fetch(`${MP_API_BASE}/v1/payments/search?${query.toString()}`, {
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      this.logger.error(`Payment search failed (${response.status}): ${errorBody}`);
      throw new BadRequestException("No se pudo verificar el pago.");
    }

    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return results.map((payment: any) => ({
      id: String(payment.id),
      status: String(payment.status ?? ""),
      externalReference: payment.external_reference ?? null,
      transactionAmount: typeof payment.transaction_amount === "number" ? payment.transaction_amount : null,
      currencyId: payment.currency_id ?? null
    }));
  }

  /** Reloads an existing Checkout Pro preference instead of creating another payment intent. */
  async getPreference(preferenceId: string): Promise<MpPreference> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      throw new BadRequestException("Mercado Pago is not configured.");
    }

    const response = await fetch(`${MP_API_BASE}/checkout/preferences/${encodeURIComponent(preferenceId)}`, {
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      this.logger.error(`Preference lookup failed (${response.status}): ${errorBody}`);
      throw new BadRequestException("No se pudo retomar el pago de la publicación.");
    }

    const data = await response.json();
    const initPoint = data.init_point ?? data.sandbox_init_point;
    if (!data.id || !initPoint) {
      throw new BadRequestException("No se pudo retomar el pago de la publicación.");
    }

    return {
      id: String(data.id),
      initPoint: String(initPoint),
      externalReference: data.external_reference ?? null
    };
  }

  async refundPayment(paymentId: string, idempotencyKey: string) {
    const accessToken = this.getAccessToken();
    if (!accessToken) throw new ServiceUnavailableException("Mercado Pago no está configurado para devolver el pago.");

    let response: Response;
    try {
      response = await fetch(`${MP_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
        method: "POST",
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey
        },
        // Omitting amount requests the full refund, per Mercado Pago's Payments API.
        body: "{}"
      });
    } catch {
      throw new ServiceUnavailableException("No se pudo confirmar el reembolso con Mercado Pago. Se reintentará automáticamente.");
    }
    if (!response.ok) {
      this.logger.error(`Refund for payment ${paymentId} failed with HTTP ${response.status}.`);
      throw new ServiceUnavailableException(`Mercado Pago no pudo completar el reembolso (HTTP ${response.status}). Se reintentará automáticamente.`);
    }
    const data = await response.json();
    if (!data.id || String(data.payment_id) !== paymentId || typeof data.amount !== "number" || !data.status) {
      throw new ServiceUnavailableException("Mercado Pago devolvió una confirmación de reembolso inválida.");
    }
    return { id: String(data.id), status: String(data.status), amount: data.amount };
  }

  /**
   * Validates the `x-signature` header per Mercado Pago's official webhook signature scheme:
   * header format `ts=<ts>,v1=<hash>`, manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`,
   * HMAC-SHA256 with the integration's webhook secret.
   * Returns false (never throws) so the caller decides whether to reject or just warn.
   */
  verifyWebhookSignature(params: { xSignature?: string; xRequestId?: string; dataId?: string }): boolean {
    const secret = this.config.get<string>("MP_WEBHOOK_SECRET", "").trim();
    if (!secret || !params.xSignature || !params.dataId) return false;

    const parts: Record<string, string> = {};
    for (const entry of params.xSignature.split(",")) {
      const [key, value] = entry.split("=");
      if (key && value) parts[key.trim()] = value.trim();
    }

    const ts = parts.ts;
    const hash = parts.v1;
    if (!ts || !hash) return false;

    const manifest = `id:${params.dataId};request-id:${params.xRequestId ?? ""};ts:${ts};`;
    const computed = createHmac("sha256", secret).update(manifest).digest("hex");

    try {
      const a = Buffer.from(computed, "hex");
      const b = Buffer.from(hash, "hex");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
