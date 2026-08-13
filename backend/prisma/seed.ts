import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

function slug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const roles = await Promise.all([
    prisma.role.upsert({ where: { code: "player" }, update: {}, create: { code: "player", name: "Player" } }),
    prisma.role.upsert({ where: { code: "seller" }, update: {}, create: { code: "seller", name: "Seller" } }),
    prisma.role.upsert({ where: { code: "organizer" }, update: {}, create: { code: "organizer", name: "Organizer" } }),
    prisma.role.upsert({ where: { code: "admin" }, update: {}, create: { code: "admin", name: "Admin" } }),
    prisma.role.upsert({ where: { code: "superadmin" }, update: {}, create: { code: "superadmin", name: "Super Admin" } })
  ]);

  const user = await prisma.user.upsert({
    where: { email: "adrian@poloconnect.app" },
    update: {},
    create: {
      firstName: "Adrian",
      lastName: "Suarez",
      email: "adrian@poloconnect.app",
      username: "polo.connect",
      phone: "+541145567890",
      credential: { create: { passwordHash: await argon2.hash("PoloConnect123!") } },
      settings: { create: {} },
      roles: { create: roles.map((role) => ({ roleId: role.id })) }
    }
  });

  const adminRole = roles.find((role) => role.code === "admin")!;
  const superadminRole = roles.find((role) => role.code === "superadmin")!;
  const playerRole = roles.find((role) => role.code === "player")!;

  const secondaryAdmin = await prisma.user.upsert({
    where: { email: "admin@poloconnect.app" },
    update: {},
    create: {
      firstName: "Panel",
      lastName: "Admin",
      email: "admin@poloconnect.app",
      username: "admin.panel",
      phone: "+541145567891",
      credential: { create: { passwordHash: await argon2.hash("PoloConnect123!") } },
      settings: { create: {} },
      roles: { create: [{ roleId: adminRole.id }, { roleId: playerRole.id }] }
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superadminRole.id } },
    update: {},
    create: { userId: user.id, roleId: superadminRole.id }
  });

  const clubs = await Promise.all(["Tortugas Club", "Hurlingham Club", "Campo Argentino de Polo", "Belgrano Athletic Club", "San Benito Club", "Pilar Polo", "La Ensenada"].map((name) =>
    prisma.club.upsert({ where: { slug: slug(name) }, update: {}, create: { name, slug: slug(name), location: "Buenos Aires, Argentina" } })
  ));

  const teamNames = ["La Dolfina", "Ellerstina", "Coronel Suarez", "Indios Chapaleufu", "Monterrico", "Las Acacias", "Santa Maria", "Sancaleta", "Palermo", "Pilar"];
  const teams = new Map<string, Awaited<ReturnType<typeof prisma.team.upsert>>>();
  for (const name of teamNames) {
    teams.set(name, await prisma.team.upsert({ where: { slug: slug(name) }, update: {}, create: { name, slug: slug(name), clubId: clubs[0].id } }));
  }

  const tournament = await prisma.tournament.upsert({
    where: { slug: "copa-polo-connect" },
    update: {},
    create: {
      name: "Copa Polo Connect",
      slug: "copa-polo-connect",
      clubId: clubs[2].id,
      startDate: new Date(Date.UTC(2026, 5, 8)),
      levelLabel: "16 goles",
      minHandicap: 0,
      maxHandicap: 16,
      maxTeams: 8,
      contactName: "Pedro Gomez",
      contactPhone: "1145563333"
    }
  });

  // El seed base no debe dejar partidos live de demo activos.
  await prisma.match.deleteMany({ where: { externalCode: "2-1" } });

  for (const room of [
    ["palermo", "Comunidad Polo Arena", "Partidos, horarios y convocatorias de polo arena.", "trophy-outline", "#d8ecff", false],
    ["dolfina", "Comunidad Logística Caballos", "Coordinación de traslados, cupos y viajes compartidos.", "radio-outline", "#e8f7f4", false],
    ["mercado", "Comunidad Roda Polo", "Torneos, ruedas, prácticas y partidos abiertos.", "swap-horizontal-outline", "#fff4dc", false],
    ["hurlingham", "Comunidad Bajo Buenos Aires", "Prácticas, canchas y jugadores disponibles por zona.", "calendar-outline", "#eaf5ff", true]
  ] as const) {
    await prisma.chatRoom.upsert({ where: { externalCode: room[0] }, update: {}, create: { externalCode: room[0], title: room[1], description: room[2], kind: "general", icon: room[3], tone: room[4], isRecommended: room[5] } });
  }

  const homeHeroAds = [
    { sortOrder: 1, imageUrl: "asset:home/hero-1", targetUrl: "https://polohub.net/" },
    { sortOrder: 2, imageUrl: "asset:home/hero-2", targetUrl: "https://polohub.net/" },
    { sortOrder: 3, imageUrl: "asset:home/hero-3", targetUrl: "https://polohub.net/" }
  ] as const;

  for (const ad of homeHeroAds) {
    await prisma.appContentItem.upsert({
      where: { section_slot_type_sortOrder: { section: "home", slot: "hero_ads", type: "ad", sortOrder: ad.sortOrder } },
      update: { imageUrl: ad.imageUrl, targetUrl: ad.targetUrl, isActive: true, updatedBy: user.id },
      create: { type: "ad", section: "home", slot: "hero_ads", sortOrder: ad.sortOrder, imageUrl: ad.imageUrl, targetUrl: ad.targetUrl, createdBy: user.id, updatedBy: user.id }
    });
  }

  const homeCompactAds = [
    { sortOrder: 1, imageUrl: "asset:home/compact-1" },
    { sortOrder: 2, imageUrl: "asset:home/compact-2" },
    { sortOrder: 3, imageUrl: "asset:home/compact-3" }
  ] as const;

  for (const ad of homeCompactAds) {
    await prisma.appContentItem.upsert({
      where: { section_slot_type_sortOrder: { section: "home", slot: "compact_ads", type: "ad", sortOrder: ad.sortOrder } },
      update: { imageUrl: ad.imageUrl, isActive: true, updatedBy: user.id },
      create: { type: "ad", section: "home", slot: "compact_ads", sortOrder: ad.sortOrder, imageUrl: ad.imageUrl, createdBy: user.id, updatedBy: user.id }
    });
  }

  const mainNews = [
    {
      sortOrder: 1,
      title: "Cambiaso renueva con La Dolfina",
      subtitle: "Fichaje",
      body: "Continuidad confirmada por dos temporadas más.",
      imageUrl: "asset:home/hero-1",
      targetUrl: "https://polohub.net/"
    },
    {
      sortOrder: 2,
      title: "Palermo 2026 ya tiene fixture",
      subtitle: "Torneo",
      body: "Calendario oficial completo publicado por la AAP.",
      imageUrl: "asset:home/hero-2",
      targetUrl: "https://polohub.net/"
    },
    {
      sortOrder: 3,
      title: "Nuevos equipos confirmados para la temporada",
      subtitle: "Actualidad",
      body: "Ya están definidos los primeros planteles para la gira de verano.",
      imageUrl: "asset:home/hero-3",
      targetUrl: "https://polohub.net/"
    }
  ] as const;

  for (const entry of mainNews) {
    await prisma.appContentItem.upsert({
      where: { section_slot_type_sortOrder: { section: "home", slot: "main_news", type: "news", sortOrder: entry.sortOrder } },
      update: { title: entry.title, subtitle: entry.subtitle, body: entry.body, imageUrl: entry.imageUrl, targetUrl: entry.targetUrl, isActive: true, updatedBy: secondaryAdmin.id },
      create: { type: "news", section: "home", slot: "main_news", sortOrder: entry.sortOrder, title: entry.title, subtitle: entry.subtitle, body: entry.body, imageUrl: entry.imageUrl, targetUrl: entry.targetUrl, createdBy: secondaryAdmin.id, updatedBy: secondaryAdmin.id }
    });
  }

  await prisma.appContentItem.upsert({
    where: { section_slot_type_sortOrder: { section: "branding", slot: "app_logo", type: "logo", sortOrder: 1 } },
    update: { title: "Polo Connect", imageUrl: "asset:app/logo", isActive: true, updatedBy: user.id },
    create: { type: "logo", section: "branding", slot: "app_logo", sortOrder: 1, title: "Polo Connect", imageUrl: "asset:app/logo", createdBy: user.id, updatedBy: user.id }
  });

  const communityAds = [
    { sortOrder: 1, imageUrl: "asset:community/slide-1" },
    { sortOrder: 2, imageUrl: "asset:community/slide-2" },
    { sortOrder: 3, imageUrl: "asset:community/slide-3" }
  ] as const;

  for (const ad of communityAds) {
    await prisma.appContentItem.upsert({
      where: { section_slot_type_sortOrder: { section: "community", slot: "ads", type: "ad", sortOrder: ad.sortOrder } },
      update: { imageUrl: ad.imageUrl, isActive: true, updatedBy: user.id },
      create: { type: "ad", section: "community", slot: "ads", sortOrder: ad.sortOrder, imageUrl: ad.imageUrl, createdBy: user.id, updatedBy: user.id }
    });
  }

  const liveAds = [
    { sortOrder: 1, imageUrl: "asset:live/slide-1" },
    { sortOrder: 2, imageUrl: "asset:live/slide-2" },
    { sortOrder: 3, imageUrl: "asset:live/slide-3" }
  ] as const;

  for (const ad of liveAds) {
    await prisma.appContentItem.upsert({
      where: { section_slot_type_sortOrder: { section: "live", slot: "ads", type: "ad", sortOrder: ad.sortOrder } },
      update: { imageUrl: ad.imageUrl, isActive: true, updatedBy: user.id },
      create: { type: "ad", section: "live", slot: "ads", sortOrder: ad.sortOrder, imageUrl: ad.imageUrl, createdBy: user.id, updatedBy: user.id }
    });
  }

  await prisma.horseAuctionEvent.deleteMany({});

}

main().finally(async () => prisma.$disconnect());
