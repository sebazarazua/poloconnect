import { Injectable, NotFoundException } from "@nestjs/common";
import { RequestUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../database/prisma.service";
import { UpsertHorseAuctionEventDto, UpsertHorseAuctionHorseDto } from "./dto/upsert-horse-auction-event.dto";

@Injectable()
export class HorseAuctionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const events = await this.prisma.horseAuctionEvent.findMany({
      where: { deletedAt: null },
      include: {
        horses: {
          select: {
            id: true,
            reservePriceCents: true
          }
        }
      },
      orderBy: { eventDate: "asc" }
    });

    return events.map((event) => {
      const prices = event.horses.map((horse) => horse.reservePriceCents);
      const startingPriceCents = prices.length > 0 ? Math.min(...prices) : null;

      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        imageUrl: event.imageUrl,
        organizer: event.organizer,
        venue: event.venue,
        city: event.city,
        country: event.country,
        eventDate: event.eventDate,
        contactName: event.contactName,
        contactPhone: event.contactPhone,
        contactEmail: event.contactEmail,
        websiteUrl: event.websiteUrl,
        notes: event.notes,
        horseCount: event.horses.length,
        startingPriceCents
      };
    });
  }

  async detail(id: string) {
    const whereByIdOrSlug = this.isUuid(id)
      ? [{ id }, { slug: id }]
      : [{ slug: id }];

    const event = await this.prisma.horseAuctionEvent.findFirst({
      where: {
        OR: whereByIdOrSlug,
        deletedAt: null
      },
      include: {
        horses: {
          orderBy: [{ lotNumber: "asc" }, { horseName: "asc" }]
        }
      }
    });

    if (!event) {
      throw new NotFoundException("Horse auction event not found.");
    }

    return {
      id: event.id,
      slug: event.slug,
      title: event.title,
      imageUrl: event.imageUrl,
      organizer: event.organizer,
      venue: event.venue,
      city: event.city,
      country: event.country,
      eventDate: event.eventDate,
      contactName: event.contactName,
      contactPhone: event.contactPhone,
      contactEmail: event.contactEmail,
      websiteUrl: event.websiteUrl,
      notes: event.notes,
      horses: event.horses.map((horse) => ({
        id: horse.id,
        lotNumber: horse.lotNumber,
        horseName: horse.horseName,
        imageUrl: horse.imageUrl,
        ownerName: horse.ownerName,
        reservePriceCents: horse.reservePriceCents,
        currency: horse.currency,
        breed: horse.breed,
        sex: horse.sex,
        ageYears: horse.ageYears,
        coatColor: horse.coatColor,
        contactPhone: horse.contactPhone,
        contactEmail: horse.contactEmail
      }))
    };
  }

  async adminList() {
    return this.prisma.horseAuctionEvent.findMany({
      where: { deletedAt: null },
      include: {
        horses: {
          orderBy: [{ lotNumber: "asc" }, { horseName: "asc" }]
        }
      },
      orderBy: { eventDate: "asc" }
    });
  }

  async adminCreateEvent(user: RequestUser, dto: UpsertHorseAuctionEventDto) {
    return this.prisma.horseAuctionEvent.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        imageUrl: this.normalizeNullable(dto.imageUrl),
        organizer: dto.organizer,
        venue: dto.venue,
        city: dto.city,
        country: dto.country ?? "Argentina",
        eventDate: new Date(dto.eventDate),
        contactName: dto.contactName,
        contactPhone: this.normalizeNullable(dto.contactPhone),
        contactEmail: this.normalizeNullable(dto.contactEmail),
        websiteUrl: this.normalizeNullable(dto.websiteUrl),
        notes: this.normalizeNullable(dto.notes)
      },
      include: { horses: true }
    });
  }

  async adminUpdateEvent(user: RequestUser, eventId: string, dto: UpsertHorseAuctionEventDto) {
    await this.ensureEventExists(eventId);

    return this.prisma.horseAuctionEvent.update({
      where: { id: eventId },
      data: {
        slug: dto.slug,
        title: dto.title,
        imageUrl: this.normalizeNullable(dto.imageUrl),
        organizer: dto.organizer,
        venue: dto.venue,
        city: dto.city,
        country: dto.country ?? "Argentina",
        eventDate: new Date(dto.eventDate),
        contactName: dto.contactName,
        contactPhone: this.normalizeNullable(dto.contactPhone),
        contactEmail: this.normalizeNullable(dto.contactEmail),
        websiteUrl: this.normalizeNullable(dto.websiteUrl),
        notes: this.normalizeNullable(dto.notes)
      },
      include: {
        horses: {
          orderBy: [{ lotNumber: "asc" }, { horseName: "asc" }]
        }
      }
    });
  }

  async adminDeleteEvent(user: RequestUser, eventId: string) {
    await this.ensureEventExists(eventId);

    await this.prisma.horseAuctionEvent.update({
      where: { id: eventId },
      data: { deletedAt: new Date() }
    });

    return { ok: true };
  }

  async adminCreateHorse(user: RequestUser, eventId: string, dto: UpsertHorseAuctionHorseDto) {
    await this.ensureEventExists(eventId);

    return this.prisma.horseAuctionHorse.create({
      data: {
        eventId,
        lotNumber: dto.lotNumber ?? null,
        horseName: dto.horseName,
        imageUrl: this.normalizeNullable(dto.imageUrl),
        ownerName: dto.ownerName,
        reservePriceCents: dto.reservePriceCents,
        currency: dto.currency ?? "USD",
        breed: this.normalizeNullable(dto.breed),
        sex: this.normalizeNullable(dto.sex),
        ageYears: dto.ageYears ?? null,
        coatColor: this.normalizeNullable(dto.coatColor),
        contactPhone: this.normalizeNullable(dto.contactPhone),
        contactEmail: this.normalizeNullable(dto.contactEmail)
      }
    });
  }

  async adminUpdateHorse(user: RequestUser, horseId: string, dto: UpsertHorseAuctionHorseDto) {
    const horse = await this.prisma.horseAuctionHorse.findUnique({ where: { id: horseId } });
    if (!horse) {
      throw new NotFoundException("Horse auction horse not found.");
    }

    await this.ensureEventExists(horse.eventId);

    return this.prisma.horseAuctionHorse.update({
      where: { id: horseId },
      data: {
        lotNumber: dto.lotNumber ?? null,
        horseName: dto.horseName,
        imageUrl: this.normalizeNullable(dto.imageUrl),
        ownerName: dto.ownerName,
        reservePriceCents: dto.reservePriceCents,
        currency: dto.currency ?? "USD",
        breed: this.normalizeNullable(dto.breed),
        sex: this.normalizeNullable(dto.sex),
        ageYears: dto.ageYears ?? null,
        coatColor: this.normalizeNullable(dto.coatColor),
        contactPhone: this.normalizeNullable(dto.contactPhone),
        contactEmail: this.normalizeNullable(dto.contactEmail)
      }
    });
  }

  async adminDeleteHorse(user: RequestUser, horseId: string) {
    const horse = await this.prisma.horseAuctionHorse.findUnique({ where: { id: horseId } });
    if (!horse) {
      throw new NotFoundException("Horse auction horse not found.");
    }

    await this.prisma.horseAuctionHorse.delete({ where: { id: horseId } });
    return { ok: true };
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private async ensureEventExists(eventId: string) {
    const event = await this.prisma.horseAuctionEvent.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) {
      throw new NotFoundException("Horse auction event not found.");
    }
  }

  private normalizeNullable(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
