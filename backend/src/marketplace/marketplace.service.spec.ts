import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { MarketplaceService } from "./marketplace.service";
import { MarketplaceRefundsService } from "./marketplace-refunds.service";

const owner = { id: "seller", email: "seller@example.test", username: "seller", roles: [] };
const body = {
  name: "Casco", description: "Descripcion completa", category: "equipamiento", status: "Usado",
  price: 123.45, currency: "USD", imageUrls: ["/media/products/one.jpg", "/media/products/two.jpg"]
};

function setup(status = "pending_payment") {
  const product: any = {
    id: "product", sellerId: owner.id, status, deletedAt: null, version: 1,
    title: body.name, description: body.description, category: body.category, condition: body.status,
    priceCents: 12345, currency: "USD", images: body.imageUrls.map((url) => ({ url })), favorites: [],
    seller: { id: owner.id, firstName: "Test", lastName: "Seller" }
  };
  const record: any = { id: "record", productId: product.id, sellerId: owner.id, amountCents: 10000, currency: "ARS", status: "pending", mpPaymentId: null,
    mpPreferenceId: "preference",
    refundRequestedAt: null, refundedAt: null, refundNextAttemptAt: null, refundLastError: null };
  product.payments = [record];
  const payment = { id: "mp-payment", externalReference: record.id, status: "approved", transactionAmount: 100, currencyId: "ARS" };
  const prisma: any = {
    product: {
      findUnique: jest.fn(async () => ({ ...product })),
      findFirst: jest.fn(async () => product),
      findUniqueOrThrow: jest.fn(async () => product),
      findMany: jest.fn(async (args) => args.select ? [] : [product]),
      update: jest.fn(async ({ where, data }) => {
        if (where.status && product.status === "rejected") throw { code: "P2025" };
        const { images, version, ...fields } = data;
        Object.assign(product, fields);
        if (version) product.version += version.increment;
        if (images) product.images = images.create;
        return product;
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const statusMatches = typeof where.status === "string" ? where.status === product.status : where.status.in.includes(product.status);
        const deletedAtMatches = where.deletedAt === null
          ? !product.deletedAt
          : where.deletedAt?.not === null
            ? Boolean(product.deletedAt)
            : true;
        if (!statusMatches || !deletedAtMatches || (where.moderationNotes && where.moderationNotes !== product.moderationNotes)) return { count: 0 };
        const { version, ...fields } = data;
        Object.assign(product, fields);
        if (version) product.version += version.increment;
        return { count: 1 };
      })
    },
    marketplacePayment: {
      findUnique: jest.fn(async () => ({ ...record })),
      findMany: jest.fn(async () => record.refundRequestedAt && !record.refundedAt ? [{ ...record }] : []),
      update: jest.fn(async ({ data }) => Object.assign(record, data)),
      updateMany: jest.fn(async ({ where, data }) => {
        if (where.product && product.status !== where.product.status) return { count: 0 };
        if (typeof where.status === "string" && record.status !== where.status) return { count: 0 };
        if (where.status?.not === record.status) return { count: 0 };
        if (where.refundedAt === null && record.refundedAt) return { count: 0 };
        if (where.refundRequestedAt === null && record.refundRequestedAt) return { count: 0 };
        Object.assign(record, data);
        return { count: 1 };
      })
    }
  };
  prisma.$transaction = jest.fn(async (callback) => Array.isArray(callback) ? Promise.all(callback) : callback(prisma));
  const mercadoPago = { verifyWebhookSignature: jest.fn(() => true), getPayment: jest.fn(async () => payment),
    findPaymentsByExternalReference: jest.fn(async () => []),
    getPreference: jest.fn(async () => ({ id: "preference", initPoint: "https://mercadopago.test/checkout", externalReference: record.id })),
    refundPayment: jest.fn(async () => ({ id: "refund-1", status: "approved", amount: 100 })) };
  const refunds = new MarketplaceRefundsService(prisma, mercadoPago as any);
  const media = { ensureStoredMediaUrl: jest.fn(async (_scope, url) => url), extractStorageKeyFromUrl: jest.fn((url) => url.replace("/media/", "")) };
  const service = new MarketplaceService(prisma, { get: (_key: string, fallback: string) => fallback } as any, media as any, mercadoPago as any,
    { assertUsersCanInteract: jest.fn(), filterBlockedUserIds: jest.fn(async () => new Set()) } as any,
    { assertAllowed: jest.fn() } as any, refunds);
  const webhook = () => service.handleMercadoPagoWebhook({ query: { type: "payment", "data.id": payment.id }, body: {}, headers: {} });
  return { service, prisma, product, record, payment, media, webhook, refunds, mercadoPago };
}

describe("Marketplace publication lifecycle", () => {
  it("publishes automatically after verified approval and ignores duplicate approvals", async () => {
    const h = setup();
    await h.webhook();
    expect(h.record.status).toBe("approved");
    expect(h.product.status).toBe("active");
    expect(h.product.version).toBe(2);
    await h.webhook();
    expect(h.product.version).toBe(2);
  });

  it("publishes a reviewed listing when its approved payment is confirmed again", async () => {
    const h = setup("pending_review");
    Object.assign(h.record, { status: "approved", mpPaymentId: h.payment.id });
    await h.webhook();
    expect(h.product.status).toBe("active");
  });

  it.each(["rejected", "paused", "sold"])("payment approval cannot reactivate a %s listing", async (status) => {
    const h = setup(status);
    await h.webhook();
    expect(h.product.status).toBe(status);
  });

  it("does not resurrect a deleted listing", async () => {
    const h = setup();
    h.product.deletedAt = new Date();
    await h.webhook();
    expect(h.product.status).toBe("pending_payment");
    expect(h.product.deletedAt).not.toBeNull();
  });

  it("restores a listing when an approval races the pending-payment expiry cleanup", async () => {
    const h = setup();
    h.product.deletedAt = new Date();
    h.product.moderationNotes = "Pago no completado dentro del plazo.";
    await h.webhook();
    expect(h.product.status).toBe("active");
    expect(h.product.deletedAt).toBeNull();
  });

  it.each([
    { transactionAmount: 99, currencyId: "ARS" },
    { transactionAmount: 100, currencyId: "USD" },
    { transactionAmount: null, currencyId: "ARS" },
    { transactionAmount: 100, currencyId: null }
  ])("does not publish with invalid or missing payment amounts/currency (%j)", async (payment) => {
    const h = setup();
    Object.assign(h.payment, payment);
    await h.webhook();
    expect(h.record.status).toBe("rejected");
    expect(h.product.status).not.toBe("active");
  });

  it("allows a payment previously pending to become approved", async () => {
    const h = setup();
    h.payment.status = "in_process";
    await h.webhook();
    expect(h.product.status).toBe("pending_payment");
    h.payment.status = "approved";
    await h.webhook();
    expect(h.product.status).toBe("active");
  });

  it("does not regress an approved payment after a stale notification", async () => {
    const h = setup();
    await h.webhook();
    h.payment.status = "pending";
    await h.webhook();
    expect(h.record.status).toBe("approved");
    expect(h.product.status).toBe("active");
  });

  it("rejects edits of rejected publications before processing images", async () => {
    const h = setup("rejected");
    await expect(h.service.updateProduct(owner, h.product.id, body)).rejects.toThrow(ForbiddenException);
    expect(h.media.ensureStoredMediaUrl).not.toHaveBeenCalled();
    expect(h.prisma.product.update).not.toHaveBeenCalled();
  });

  it("rejects an edit if moderation rejects the publication during image processing", async () => {
    const h = setup("pending_review");
    h.media.ensureStoredMediaUrl.mockImplementation(async (_scope, url) => { h.product.status = "rejected"; return url; });
    await expect(h.service.updateProduct(owner, h.product.id, body)).rejects.toThrow(ForbiddenException);
    expect(h.product.version).toBe(1);
  });

  it.each(["pending_review", "pending_payment", "active", "paused"])("edits a %s listing with all images and exact price", async (status) => {
    const h = setup(status);
    const edited = await h.service.updateProduct(owner, h.product.id, { ...body, name: "Casco editado" });
    expect(edited.name).toBe("Casco editado");
    expect(edited.description).toBe(body.description);
    expect(edited.price).toBe(123.45);
    expect(edited.images).toEqual(body.imageUrls);
    expect(edited.publicationStatus).toBe(status);
  });

  it("loads pending payment detail for its owner but not another user", async () => {
    const h = setup();
    expect((await h.service.getProduct(owner.id, h.product.id)).price).toBe(123.45);
    await expect(h.service.getProduct("other", h.product.id)).rejects.toThrow(NotFoundException);
  });

  it("includes pending payment listings in the owner's list", async () => {
    const h = setup();
    const result = await h.service.listProducts(owner.id, { sellerId: owner.id, limit: 20 });
    expect(result.data[0].publicationStatus).toBe("pending_payment");
    expect(result.data[0].payment).toEqual(expect.objectContaining({ status: "pending", canResume: true }));
    expect(h.prisma.product.findMany.mock.calls[1][0].where.status).toBeUndefined();
  });

  it("reconciles a slow approved payment before expiring its pending listing", async () => {
    const h = setup();
    h.prisma.product.findMany.mockResolvedValueOnce([{
      id: h.product.id,
      sellerId: h.product.sellerId,
      title: h.product.title,
      payments: [h.record]
    }]);
    h.mercadoPago.findPaymentsByExternalReference.mockResolvedValueOnce([h.payment]);

    await h.service.listProducts(owner.id, { sellerId: owner.id, limit: 20 });
    expect(h.product.status).toBe("active");
    expect(h.product.deletedAt).toBeNull();
  });

  it("resumes the existing preference without creating another listing or payment record", async () => {
    const h = setup();
    const result = await h.service.resumeProductPayment(owner, h.product.id);

    expect(h.mercadoPago.findPaymentsByExternalReference).toHaveBeenCalledWith(h.record.id);
    expect(h.mercadoPago.getPreference).toHaveBeenCalledWith(h.record.mpPreferenceId);
    expect(result.payment).toEqual(expect.objectContaining({ status: "pending", canResume: true, url: "https://mercadopago.test/checkout" }));
    expect(h.prisma.product.update).not.toHaveBeenCalled();
    expect(h.prisma.marketplacePayment.update).not.toHaveBeenCalled();
  });

  it("synchronizes an approved Mercado Pago payment before returning a checkout URL", async () => {
    const h = setup();
    h.mercadoPago.findPaymentsByExternalReference.mockResolvedValueOnce([h.payment]);
    const result = await h.service.resumeProductPayment(owner, h.product.id);

    expect(result.payment.status).toBe("approved");
    expect(result.payment.url).toBeNull();
    expect(result.product.publicationStatus).toBe("active");
    expect(h.mercadoPago.getPreference).not.toHaveBeenCalled();
  });

  it("does not reopen Checkout when Mercado Pago is already processing a payment", async () => {
    const h = setup();
    h.payment.status = "in_process";
    h.mercadoPago.findPaymentsByExternalReference.mockResolvedValueOnce([h.payment]);
    const result = await h.service.resumeProductPayment(owner, h.product.id);

    expect(result.payment).toEqual(expect.objectContaining({ status: "pending", canResume: false, url: null }));
    expect(h.record.mpPaymentId).toBe(h.payment.id);
    expect(h.mercadoPago.getPreference).not.toHaveBeenCalled();
  });

  it("verifies a payment id from the return URL server-to-server", async () => {
    const h = setup();
    const result = await h.service.syncProductPayment(owner, h.product.id, h.payment.id);

    expect(h.mercadoPago.getPayment).toHaveBeenCalledWith(h.payment.id);
    expect(result.payment.status).toBe("approved");
    expect(result.product.publicationStatus).toBe("active");
  });

  it("recovers the product from Mercado Pago when an older deep link has no product id", async () => {
    const h = setup();
    const result = await h.service.syncReturnedProductPayment(owner, h.payment.id);

    expect(h.mercadoPago.getPayment).toHaveBeenCalledWith(h.payment.id);
    expect(result.product.id).toBe(h.product.id);
    expect(result.payment.status).toBe("approved");
  });

  it("rejects a return payment that belongs to another external reference", async () => {
    const h = setup();
    h.payment.externalReference = "another-record";
    await expect(h.service.syncProductPayment(owner, h.product.id, h.payment.id)).rejects.toThrow("no corresponde");
    expect(h.product.status).toBe("pending_payment");
  });

  it("allows moderation to reject an automatically published listing", async () => {
    const h = setup("active");
    await h.service.rejectProduct({ ...owner, roles: ["admin"] }, h.product.id, { reason: "No permitido" });
    expect(h.product.status).toBe("rejected");
  });

  it("refunds the publication payment on rejection", async () => {
    const h = setup();
    await h.webhook();
    const rejected = await h.service.rejectProduct(owner, h.product.id, {});
    expect(rejected.publicationStatus).toBe("rejected");
    expect(rejected.refundStatus).toBe("refunded");
    expect(h.record.status).toBe("refunded");
    expect(h.record.mpRefundId).toBe("refund-1");
    expect(h.mercadoPago.refundPayment).toHaveBeenCalledWith(h.payment.id, "listing-refund-record");
    await h.service.rejectProduct(owner, h.product.id, {});
    expect(h.mercadoPago.refundPayment).toHaveBeenCalledTimes(1);
  });

  it("recovers a previously rejected paid listing", async () => {
    const h = setup("rejected");
    Object.assign(h.record, { status: "approved", mpPaymentId: h.payment.id });
    expect((await h.service.rejectProduct(owner, h.product.id, {})).refundStatus).toBe("refunded");
  });

  it("refunds a payment approved after the listing was rejected", async () => {
    const h = setup();
    await h.service.rejectProduct(owner, h.product.id, {});
    expect(h.mercadoPago.refundPayment).not.toHaveBeenCalled();
    await h.webhook();
    expect(h.record.status).toBe("refunded");
    expect(h.product.status).toBe("rejected");
  });

  it("keeps a failed refund durable and retries it with the same key after restart", async () => {
    const h = setup();
    await h.webhook();
    h.mercadoPago.refundPayment.mockRejectedValueOnce(new Error("Mercado Pago unavailable"));
    const rejected = await h.service.rejectProduct(owner, h.product.id, {});
    expect(rejected.refundStatus).toBe("failed");
    expect(h.record.refundedAt).toBeNull();
    expect(h.record.refundRequestedAt).toBeInstanceOf(Date);
    expect(h.record.refundNextAttemptAt).toBeInstanceOf(Date);
    const restarted = new MarketplaceRefundsService(h.prisma, h.mercadoPago as any);
    await restarted.processProduct(h.product.id);
    expect(h.record.status).toBe("refunded");
    expect(h.record.refundLastError).toBeNull();
    expect(h.mercadoPago.refundPayment.mock.calls[0]).toEqual(h.mercadoPago.refundPayment.mock.calls[1]);
  });

  it("recognizes an already refunded payment after losing the original response", async () => {
    const h = setup("rejected");
    Object.assign(h.record, { status: "approved", mpPaymentId: h.payment.id, refundRequestedAt: new Date() });
    h.payment.status = "refunded";
    await h.refunds.processProduct(h.product.id);
    expect(h.record.status).toBe("refunded");
    expect(h.mercadoPago.refundPayment).not.toHaveBeenCalled();
  });

  it("does not mark a pending or partial refund as a full refund", async () => {
    const h = setup();
    await h.webhook();
    h.mercadoPago.refundPayment.mockResolvedValue({ id: "refund-1", status: "pending", amount: 50 });
    const rejected = await h.service.rejectProduct(owner, h.product.id, {});
    expect(rejected.refundStatus).toBe("failed");
    expect(h.record.status).toBe("approved");
    expect(h.record.refundedAt).toBeNull();
  });

  it("does not refund a payment with a different external reference", async () => {
    const h = setup();
    await h.webhook();
    h.payment.externalReference = "other-record";
    const rejected = await h.service.rejectProduct(owner, h.product.id, {});
    expect(rejected.refundStatus).toBe("failed");
    expect(h.mercadoPago.refundPayment).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent attempts within the same worker", async () => {
    const h = setup("rejected");
    Object.assign(h.record, { status: "approved", mpPaymentId: h.payment.id, refundRequestedAt: new Date() });
    await Promise.all([h.refunds.processProduct(h.product.id), h.refunds.processProduct(h.product.id)]);
    expect(h.mercadoPago.refundPayment).toHaveBeenCalledTimes(1);
  });

  it("a refunded webhook cannot be overwritten by a later approved webhook", async () => {
    const h = setup();
    await h.webhook();
    h.payment.status = "refunded";
    await h.webhook();
    h.payment.status = "approved";
    await h.webhook();
    expect(h.record.status).toBe("refunded");
    expect(h.product.status).toBe("paused");
  });

  it("records rejection and refund intent before contacting Mercado Pago", async () => {
    const h = setup();
    await h.webhook();
    h.mercadoPago.refundPayment.mockImplementation(async () => {
      expect(h.product.status).toBe("rejected");
      expect(h.record.refundRequestedAt).toBeInstanceOf(Date);
      return { id: "refund-1", status: "approved", amount: 100 };
    });
    await h.service.rejectProduct(owner, h.product.id, {});
  });

  it("the background worker processes persisted refund requests", async () => {
    const h = setup("rejected");
    Object.assign(h.record, { status: "approved", mpPaymentId: h.payment.id, refundRequestedAt: new Date() });
    await h.refunds.processDueRefunds();
    expect(h.record.status).toBe("refunded");
  });

  it("retains the request if the provider succeeds but persisting the receipt fails", async () => {
    const h = setup();
    await h.webhook();
    h.prisma.marketplacePayment.update.mockRejectedValueOnce(new Error("Database unavailable"));
    expect((await h.service.rejectProduct(owner, h.product.id, {})).refundStatus).toBe("failed");
    h.payment.status = "refunded";
    await h.refunds.processDueRefunds();
    expect(h.record.status).toBe("refunded");
    expect(h.mercadoPago.refundPayment).toHaveBeenCalledTimes(1);
  });

  it("a refund confirmed during a webhook cannot be overwritten by its stale approval", async () => {
    const h = setup();
    h.prisma.marketplacePayment.findUnique.mockImplementationOnce(async () => {
      const stale = { ...h.record };
      Object.assign(h.record, { status: "refunded", refundedAt: new Date() });
      return stale;
    });
    await h.webhook();
    expect(h.record.status).toBe("refunded");
    expect(h.product.status).toBe("pending_payment");
  });

  it("a concurrent admin approval cannot reactivate a rejected listing awaiting refund", async () => {
    const h = setup("pending_review");
    h.prisma.product.findFirst.mockImplementationOnce(async () => {
      const stale = { ...h.product };
      h.product.status = "rejected";
      return stale;
    });
    await expect(h.service.approveProduct(owner, h.product.id)).rejects.toThrow("ya no está disponible");
    expect(h.product.status).toBe("rejected");
  });
});
