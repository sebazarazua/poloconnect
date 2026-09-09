import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { MarketplacePayment, Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { MercadoPagoService } from "./mercadopago.service";

type RefundPayment = { status: string; refundRequestedAt?: Date | null; refundedAt?: Date | null; refundLastError?: string | null };

export function summarizeRefunds(payments: RefundPayment[]): "none" | "pending" | "failed" | "refunded" {
  const outstanding = payments.filter((payment) => payment.refundRequestedAt && !payment.refundedAt && payment.status !== "refunded");
  if (outstanding.length) return outstanding.some((payment) => payment.refundLastError) ? "failed" : "pending";
  return payments.some((payment) => payment.refundedAt || payment.status === "refunded") ? "refunded" : "none";
}

@Injectable()
export class MarketplaceRefundsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceRefundsService.name);
  private timer?: ReturnType<typeof setInterval>;
  private processing = false;
  private readonly inFlight = new Map<string, Promise<void>>();

  constructor(private readonly prisma: PrismaService, private readonly mercadoPago: MercadoPagoService) {}

  onModuleInit() {
    const run = () => void this.processDueRefunds().catch(() => this.logger.error("Could not process pending marketplace refunds."));
    this.timer = setInterval(run, 60_000);
    this.timer.unref();
    run();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async requestForProduct(productId: string, tx: Prisma.TransactionClient = this.prisma) {
    // Persist the refund intent in the same transaction that rejects the listing.
    await tx.marketplacePayment.updateMany({
      where: { productId, product: { status: "rejected" }, status: "approved", refundRequestedAt: null, refundedAt: null },
      data: { refundRequestedAt: new Date(), refundNextAttemptAt: new Date() }
    });
  }

  async processProduct(productId: string) {
    const payments = await this.prisma.marketplacePayment.findMany({
      where: { productId, refundRequestedAt: { not: null }, refundedAt: null, status: { not: "refunded" } }
    });
    for (const payment of payments) await this.processPayment(payment);
  }

  async processDueRefunds() {
    if (this.processing) return;
    this.processing = true;
    try {
      const payments = await this.prisma.marketplacePayment.findMany({
        where: {
          refundRequestedAt: { not: null }, refundedAt: null, status: { not: "refunded" },
          OR: [{ refundNextAttemptAt: null }, { refundNextAttemptAt: { lte: new Date() } }]
        },
        orderBy: { refundNextAttemptAt: { sort: "asc", nulls: "first" } },
        take: 10
      });
      for (const payment of payments) await this.processPayment(payment);
    } finally {
      this.processing = false;
    }
  }

  private processPayment(payment: MarketplacePayment) {
    const running = this.inFlight.get(payment.id);
    if (running) return running;
    const task = this.performRefund(payment).finally(() => this.inFlight.delete(payment.id));
    this.inFlight.set(payment.id, task);
    return task;
  }

  private async performRefund(record: MarketplacePayment) {
    try {
      if (!record.mpPaymentId) throw new Error("El pago aprobado no tiene identificador de Mercado Pago. Requiere revisión.");
      const payment = await this.mercadoPago.getPayment(record.mpPaymentId);
      if (payment.id !== record.mpPaymentId || payment.externalReference !== record.id) {
        throw new Error("El pago de Mercado Pago no corresponde a esta publicación.");
      }
      if (payment.status === "refunded") {
        await this.confirmRefund(record.id);
        return;
      }
      if (payment.status !== "approved") throw new Error("Mercado Pago aún no permite devolver este pago.");

      // The stable key also prevents duplicate transfers after restarts or concurrent replicas.
      const refund = await this.mercadoPago.refundPayment(record.mpPaymentId, `listing-refund-${record.id}`);
      await this.prisma.marketplacePayment.update({ where: { id: record.id }, data: { mpRefundId: refund.id } });
      if (refund.status === "approved" && payment.transactionAmount !== null && Math.round(refund.amount * 100) === Math.round(payment.transactionAmount * 100)) {
        await this.confirmRefund(record.id);
      } else {
        const confirmed = await this.mercadoPago.getPayment(record.mpPaymentId);
        if (confirmed.id === record.mpPaymentId && confirmed.externalReference === record.id && confirmed.status === "refunded") {
          await this.confirmRefund(record.id);
        } else {
          throw new Error("Mercado Pago todavía no confirmó la devolución total. Se reintentará automáticamente.");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo confirmar el reembolso.";
      this.logger.warn(`Refund pending for marketplace payment ${record.id}.`);
      await this.prisma.marketplacePayment.updateMany({
        where: { id: record.id, refundedAt: null, status: { not: "refunded" } },
        data: { refundLastError: message.slice(0, 500), refundNextAttemptAt: new Date(Date.now() + 5 * 60_000) }
      });
    }
  }

  private async confirmRefund(id: string) {
    await this.prisma.marketplacePayment.update({
      where: { id },
      data: { status: "refunded", refundedAt: new Date(), refundLastError: null, refundNextAttemptAt: null }
    });
  }
}
