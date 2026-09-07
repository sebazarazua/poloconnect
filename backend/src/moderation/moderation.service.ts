import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ModerationActionType, Prisma, ReportContentType, ReportReason, ReportStatus, UserSanctionType } from "@prisma/client";
import { page } from "../common/dto/pagination.dto";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { MediaService } from "../common/media/media.service";
import { ApplyModerationActionDto, CreateReportDto, ModerationActionQueryDto, ReportQueryDto, SanctionQueryDto, UpdateReportDto } from "./dto/moderation.dto";

const userSelect = { id: true, firstName: true, lastName: true, username: true, avatarUrl: true, email: true } as const;

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly media: MediaService) {}

  async createReport(reporterUserId: string, dto: CreateReportDto) {
    const target = await this.resolveReportTarget(dto);
    const reportedUserId = target.userId ?? dto.reportedUserId;

    if (!dto.contentId && !reportedUserId) {
      throw new BadRequestException("El reporte necesita un usuario o contenido asociado.");
    }
    if (reportedUserId === reporterUserId) {
      throw new BadRequestException("No podés reportarte a vos mismo.");
    }

    const duplicate = await this.prisma.report.findFirst({
      where: {
        reporterUserId,
        contentType: dto.contentType,
        contentId: dto.contentId ?? null,
        reportedUserId: reportedUserId ?? null,
        reason: dto.reason,
        status: { in: [ReportStatus.pending, ReportStatus.in_review] }
      }
    });
    if (duplicate) throw new ConflictException("Ya recibimos este reporte y está en revisión.");

    const previousCount = reportedUserId
      ? await this.prisma.report.count({ where: { reportedUserId, status: { in: [ReportStatus.pending, ReportStatus.in_review] } } })
      : 0;

    return this.prisma.report.create({
      data: {
        reporterUserId,
        reportedUserId: reportedUserId ?? null,
        contentType: dto.contentType,
        contentId: dto.contentId ?? null,
        reason: dto.reason,
        description: dto.description?.trim() || null,
        context: (dto.context ?? {}) as Prisma.InputJsonValue,
        priority: this.reportPriority(dto.reason, previousCount)
      }
    });
  }

  async blockUser(blockerUserId: string, blockedUserId: string) {
    if (blockerUserId === blockedUserId) throw new BadRequestException("No podés bloquearte a vos mismo.");
    const user = await this.prisma.user.findFirst({ where: { id: blockedUserId, deletedAt: null } });
    if (!user) throw new NotFoundException("Usuario no encontrado.");
    await this.prisma.userBlock.upsert({
      where: { blockerUserId_blockedUserId: { blockerUserId, blockedUserId } },
      update: {},
      create: { blockerUserId, blockedUserId }
    });
    return { ok: true };
  }

  async unblockUser(blockerUserId: string, blockedUserId: string) {
    await this.prisma.userBlock.deleteMany({ where: { blockerUserId, blockedUserId } });
    return { ok: true };
  }

  async listBlockedUsers(userId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerUserId: userId },
      include: { blocked: { select: userSelect } },
      orderBy: { createdAt: "desc" }
    });
    return blocks.map((block) => ({ ...block, blocked: this.toPublicUser(block.blocked) }));
  }

  async isBlockedBetween(firstUserId: string, secondUserId: string) {
    if (!firstUserId || !secondUserId || firstUserId === secondUserId) return false;
    return Boolean(await this.prisma.userBlock.findFirst({
      where: { OR: [{ blockerUserId: firstUserId, blockedUserId: secondUserId }, { blockerUserId: secondUserId, blockedUserId: firstUserId }] },
      select: { blockerUserId: true }
    }));
  }

  async assertUsersCanInteract(firstUserId: string, secondUserId: string) {
    if (await this.isBlockedBetween(firstUserId, secondUserId)) {
      throw new ForbiddenException("No podés interactuar con este usuario.");
    }
  }

  async filterBlockedUserIds(viewerUserId: string, userIds: string[]) {
    const uniqueIds = [...new Set(userIds.filter((id) => id && id !== viewerUserId))];
    if (uniqueIds.length === 0) return new Set<string>();
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerUserId: viewerUserId, blockedUserId: { in: uniqueIds } },
          { blockedUserId: viewerUserId, blockerUserId: { in: uniqueIds } }
        ]
      },
      select: { blockerUserId: true, blockedUserId: true }
    });
    return new Set(blocks.map((block) => block.blockerUserId === viewerUserId ? block.blockedUserId : block.blockerUserId));
  }

  async listReports(query: ReportQueryDto) {
    const limit = Number(query.limit ?? 30);
    const where: Prisma.ReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.contentType ? { contentType: query.contentType } : {}),
      ...(query.reason ? { reason: query.reason } : {}),
      ...(query.userId ? { OR: [{ reporterUserId: query.userId }, { reportedUserId: query.userId }] } : {})
    };
    const reports = await this.prisma.report.findMany({
      where,
      include: { reporter: { select: userSelect }, reportedUser: { select: userSelect }, moderator: { select: userSelect }, _count: { select: { actions: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit + 1
    });
    return page(await this.withReportedMessages(reports), limit);
  }

  async getReport(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: { select: userSelect }, reportedUser: { select: userSelect }, moderator: { select: userSelect },
        actions: { include: { moderator: { select: userSelect }, targetUser: { select: userSelect } }, orderBy: { createdAt: "desc" } },
        sanctions: { include: { user: { select: userSelect }, moderator: { select: userSelect } }, orderBy: { createdAt: "desc" } }
      }
    });
    if (!report) throw new NotFoundException("Reporte no encontrado.");
    const [reportWithMessage] = await this.withReportedMessages([report]);
    return reportWithMessage;
  }

  async updateReport(moderator: RequestUser, id: string, dto: UpdateReportDto) {
    const current = await this.prisma.report.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Reporte no encontrado.");
    const closesReport = dto.status === ReportStatus.resolved || dto.status === ReportStatus.dismissed;
    const report = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        internalNote: dto.internalNote?.trim(),
        actionTaken: dto.actionTaken?.trim(),
        moderatorUserId: moderator.id,
        resolvedAt: closesReport ? new Date() : current.resolvedAt
      }
    });
    if (dto.status && dto.status !== current.status) {
      await this.logAction({ reportId: id, moderatorUserId: moderator.id, targetUserId: report.reportedUserId, contentType: report.contentType, contentId: report.contentId, action: ModerationActionType.report_status_changed, note: dto.internalNote, metadata: { status: dto.status } });
    }
    return this.getReport(id);
  }

  async applyAction(moderator: RequestUser, reportId: string, dto: ApplyModerationActionDto) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException("Reporte no encontrado.");
    const targetUserId = report.reportedUserId;

    const contentActions: ModerationActionType[] = [ModerationActionType.content_hidden, ModerationActionType.content_deleted, ModerationActionType.content_restored];
    const userActions: ModerationActionType[] = [ModerationActionType.user_warned, ModerationActionType.user_temporarily_suspended, ModerationActionType.user_permanently_banned, ModerationActionType.user_restored];
    if (contentActions.includes(dto.action)) {
      await this.applyContentAction(report, dto.action);
    }
    if (userActions.includes(dto.action)) {
      if (!targetUserId) throw new BadRequestException("Este reporte no tiene un usuario sobre el que aplicar una sanción.");
      if (targetUserId === moderator.id) throw new BadRequestException("No podés sancionarte a vos mismo.");
      await this.applyUserAction(moderator.id, reportId, targetUserId, dto);
    }

    const resolved = dto.action !== ModerationActionType.content_restored && dto.action !== ModerationActionType.user_restored;
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: resolved ? ReportStatus.resolved : ReportStatus.in_review, moderatorUserId: moderator.id, resolvedAt: resolved ? new Date() : null, actionTaken: dto.action, internalNote: dto.note?.trim() || undefined }
    });
    await this.logAction({ reportId, moderatorUserId: moderator.id, targetUserId, contentType: report.contentType, contentId: report.contentId, action: dto.action, note: dto.note, metadata: dto.durationDays ? { durationDays: dto.durationDays } : {} });
    return this.getReport(reportId);
  }

  async listActions(query: ModerationActionQueryDto) {
    const limit = Number(query.limit ?? 50);
    const actions = await this.prisma.moderationAction.findMany({
      where: { ...(query.reportId ? { reportId: query.reportId } : {}), ...(query.userId ? { targetUserId: query.userId } : {}) },
      include: { moderator: { select: userSelect }, targetUser: { select: userSelect }, report: { select: { id: true, reason: true, status: true } } },
      orderBy: { createdAt: "desc" }, take: limit + 1
    });
    return page(actions.map((action) => ({ ...action, moderator: action.moderator ? this.toPublicUser(action.moderator) : null, targetUser: action.targetUser ? this.toPublicUser(action.targetUser) : null })), limit);
  }

  async listSanctions(query: SanctionQueryDto) {
    const limit = Number(query.limit ?? 50);
    const now = new Date();
    const sanctions = await this.prisma.userSanction.findMany({
      where: {
        ...(query.type ? { type: query.type } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.active === "true" ? { revokedAt: null, OR: [{ type: UserSanctionType.permanent_ban }, { endsAt: { gt: now } }] } : {})
      },
      include: { user: { select: userSelect }, moderator: { select: userSelect }, report: { select: { id: true, reason: true } } },
      orderBy: { createdAt: "desc" }, take: limit + 1
    });
    return page(sanctions.map((sanction) => ({ ...sanction, user: this.toPublicUser(sanction.user), moderator: sanction.moderator ? this.toPublicUser(sanction.moderator) : null })), limit);
  }

  async revokeSanction(moderator: RequestUser, sanctionId: string, note?: string) {
    const sanction = await this.prisma.userSanction.findUnique({ where: { id: sanctionId } });
    if (!sanction) throw new NotFoundException("Sanción no encontrada.");
    await this.prisma.userSanction.update({ where: { id: sanctionId }, data: { revokedAt: new Date() } });
    if (sanction.type === UserSanctionType.permanent_ban) {
      await this.prisma.user.updateMany({ where: { id: sanction.userId, status: "disabled" }, data: { status: "active" } });
    }
    await this.logAction({ reportId: sanction.reportId, moderatorUserId: moderator.id, targetUserId: sanction.userId, action: ModerationActionType.user_restored, note, metadata: { sanctionId } });
    return { ok: true };
  }

  async listBlocks() {
    return this.prisma.userBlock.findMany({ include: { blocker: { select: userSelect }, blocked: { select: userSelect } }, orderBy: { createdAt: "desc" }, take: 200 });
  }

  private async resolveReportTarget(dto: CreateReportDto) {
    if (dto.contentType === ReportContentType.user) {
      if (!dto.reportedUserId) throw new BadRequestException("Indicá el usuario reportado.");
      const user = await this.prisma.user.findFirst({ where: { id: dto.reportedUserId, deletedAt: null }, select: { id: true } });
      if (!user) throw new NotFoundException("Usuario no encontrado.");
      return { userId: user.id };
    }
    if (!dto.contentId) throw new BadRequestException("Indicá el contenido reportado.");
    if (dto.contentType === ReportContentType.chat_message) {
      const message = await this.prisma.chatMessage.findFirst({ where: { id: dto.contentId, deletedAt: null }, select: { userId: true } });
      if (!message) throw new NotFoundException("Mensaje no encontrado.");
      return { userId: message.userId };
    }
    if (dto.contentType === ReportContentType.marketplace_listing) {
      const product = await this.prisma.product.findFirst({ where: { id: dto.contentId, deletedAt: null }, select: { sellerId: true } });
      if (!product) throw new NotFoundException("Publicación no encontrada.");
      return { userId: product.sellerId };
    }
    if (dto.contentType === ReportContentType.horse) {
      const horse = await this.prisma.horseAuctionHorse.findFirst({ where: { id: dto.contentId, event: { deletedAt: null } }, select: { id: true } });
      if (!horse) throw new NotFoundException("Caballo no encontrado.");
    }
    return { userId: dto.reportedUserId };
  }

  private reportPriority(reason: ReportReason, existingCount: number) {
    const criticalReasons: ReportReason[] = [ReportReason.sexual_content, ReportReason.violence, ReportReason.hate_speech];
    const highReasons: ReportReason[] = [ReportReason.scam, ReportReason.harassment];
    const base = criticalReasons.includes(reason) ? 30
      : highReasons.includes(reason) ? 20
        : 10;
    return base + Math.min(existingCount, 10);
  }

  private async applyContentAction(report: { contentType: ReportContentType; contentId: string | null }, action: ModerationActionType) {
    if (!report.contentId) throw new BadRequestException("Este reporte no tiene contenido asociado.");
    const restore = action === ModerationActionType.content_restored;
    if (report.contentType === ReportContentType.chat_message) {
      if (action === ModerationActionType.content_deleted) {
        const message = await this.prisma.chatMessage.findUnique({ where: { id: report.contentId }, select: { id: true } });
        if (!message) throw new NotFoundException("Mensaje no encontrado.");
        await this.prisma.$transaction([
          this.prisma.chatMembership.updateMany({ where: { lastReadMessageId: message.id }, data: { lastReadMessageId: null, lastReadAt: null } }),
          this.prisma.chatMessage.delete({ where: { id: message.id } })
        ]);
        return;
      }
      const result = await this.prisma.chatMessage.updateMany({ where: { id: report.contentId }, data: restore ? { deletedAt: null, status: "sent" } : { deletedAt: new Date(), status: "removed", bodySanitized: "Contenido retirado por moderación." } });
      if (!result.count) throw new NotFoundException("Mensaje no encontrado.");
      return;
    }
    if (report.contentType === ReportContentType.marketplace_listing) {
      if (action === ModerationActionType.content_deleted) {
        const product = await this.prisma.product.findUnique({ where: { id: report.contentId }, include: { images: true } });
        if (!product) throw new NotFoundException("Publicación no encontrada.");
        await this.prisma.product.delete({ where: { id: product.id } });
        const storageKeys = product.images.map((image) => image.storageKey ?? this.media.extractStorageKeyFromUrl(image.url)).filter((key): key is string => Boolean(key));
        const legacyPaths = product.images.map((image) => this.media.extractLegacyUploadPath(image.url)).filter((path): path is string => Boolean(path));
        await Promise.allSettled([this.media.deleteStorageKeys(storageKeys), this.media.deleteLegacyUploadPaths(legacyPaths)]);
        return;
      }
      const result = await this.prisma.product.updateMany({ where: { id: report.contentId }, data: restore ? { deletedAt: null, status: "pending_review", moderationNotes: null } : { deletedAt: new Date(), status: "rejected", moderationNotes: "Contenido retirado por moderación.", version: { increment: 1 } } });
      if (!result.count) throw new NotFoundException("Publicación no encontrada.");
      return;
    }
    throw new BadRequestException("Este tipo de contenido todavía no admite ocultación automática.");
  }

  private async applyUserAction(moderatorUserId: string, reportId: string, userId: string, dto: ApplyModerationActionDto) {
    if (dto.action === ModerationActionType.user_restored) {
      await this.prisma.userSanction.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.prisma.user.updateMany({ where: { id: userId, status: "disabled" }, data: { status: "active" } });
      return;
    }
    const type = dto.action === ModerationActionType.user_warned ? UserSanctionType.warning
      : dto.action === ModerationActionType.user_temporarily_suspended ? UserSanctionType.temporary_suspension
        : UserSanctionType.permanent_ban;
    const endsAt = type === UserSanctionType.temporary_suspension ? new Date(Date.now() + (dto.durationDays ?? 7) * 24 * 60 * 60 * 1000) : null;
    await this.prisma.userSanction.create({ data: { userId, moderatorUserId, reportId, type, reason: dto.note?.trim() || null, endsAt } });
    if (type === UserSanctionType.permanent_ban) await this.prisma.user.update({ where: { id: userId }, data: { status: "disabled" } });
    const label = type === UserSanctionType.warning ? "Advertencia" : type === UserSanctionType.temporary_suspension ? "Suspensión temporal" : "Cuenta suspendida";
    void this.notifications.notifyUser(userId, { kind: "system", title: label, body: dto.note?.trim() || "Se aplicó una medida de moderación a tu cuenta.", data: { reportId, type } });
  }

  private async logAction(data: { reportId?: string | null; moderatorUserId?: string | null; targetUserId?: string | null; contentType?: ReportContentType | null; contentId?: string | null; action: ModerationActionType; note?: string; metadata?: Prisma.InputJsonValue }) {
    await this.prisma.moderationAction.create({ data: { ...data, note: data.note?.trim() || null, metadata: data.metadata ?? {} } });
  }

  private toPublicUser(user: { id: string; firstName: string; lastName: string; username: string; avatarUrl: string | null; email?: string }) {
    return { id: user.id, firstName: user.firstName, lastName: user.lastName, username: user.username, avatarUrl: user.avatarUrl, ...(user.email ? { email: user.email } : {}) };
  }

  private async withReportedMessages(reports: any[]) {
    const messageIds = reports
      .filter((report) => report.contentType === ReportContentType.chat_message && report.contentId)
      .map((report) => report.contentId);
    const messages = messageIds.length
      ? await this.prisma.chatMessage.findMany({
          where: { id: { in: messageIds } },
          select: { id: true, body: true, bodySanitized: true, deletedAt: true }
        })
      : [];
    const messagesById = new Map(messages.map((message) => [message.id, message]));

    return reports.map((report) => {
      const message = report.contentId ? messagesById.get(report.contentId) : null;
      return this.toReportDto({
        ...report,
        reportedMessage: message
          ? { body: message.deletedAt ? message.bodySanitized : message.body, removed: Boolean(message.deletedAt) }
          : null
      });
    });
  }

  private toReportDto(report: any) {
    return {
      ...report,
      reporter: report.reporter ? this.toPublicUser(report.reporter) : null,
      reportedUser: report.reportedUser ? this.toPublicUser(report.reportedUser) : null,
      moderator: report.moderator ? this.toPublicUser(report.moderator) : null,
      actions: report.actions?.map((action: any) => ({ ...action, moderator: action.moderator ? this.toPublicUser(action.moderator) : null, targetUser: action.targetUser ? this.toPublicUser(action.targetUser) : null })),
      sanctions: report.sanctions?.map((sanction: any) => ({ ...sanction, user: sanction.user ? this.toPublicUser(sanction.user) : null, moderator: sanction.moderator ? this.toPublicUser(sanction.moderator) : null }))
    };
  }
}
