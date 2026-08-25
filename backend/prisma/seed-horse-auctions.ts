import { PrismaClient } from "@prisma/client";
import { assertDemoSeedAllowed } from "./seed-guard";

const prisma = new PrismaClient();

async function main() {
  assertDemoSeedAllowed("prisma/seed-horse-auctions.ts");

  const auctionEvents = [
    {
      slug: "la-dolfina-breeders-select-sale-2026",
      title: "La Dolfina Breeders Select Sale 2026",
      imageUrl: "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=1600&q=80",
      organizer: "La Dolfina Polo Ranch",
      venue: "La Dolfina Polo Club",
      city: "Canuelas",
      country: "Argentina",
      eventDate: new Date(Date.UTC(2026, 9, 18, 18, 0, 0)),
      contactName: "Magdalena Cattaneo",
      contactPhone: "+54 9 11 4588 1200",
      contactEmail: "sales@ladolfina.com",
      websiteUrl: "https://www.ladolfina.com/",
      notes: "Remate anual de caballos de alto handicap de genetica La Dolfina.",
      horses: [
        {
          lotNumber: 1,
          horseName: "LD Open Crown",
          imageUrl: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1200&q=80",
          ownerName: "La Dolfina Stud",
          damName: "Open Candelaria",
          sireName: "Crown Prince",
          reservePriceCents: 6500000,
          currency: "USD",
          breed: "Polo Argentino",
          sex: "Mare",
          ageYears: 6,
          coatColor: "Bay",
          contactPhone: "+54 9 11 4588 1200",
          contactEmail: "sales@ladolfina.com"
        },
        {
          lotNumber: 7,
          horseName: "LD Roseta II",
          imageUrl: "https://images.unsplash.com/photo-1593179357196-ea11a2e7c119?auto=format&fit=crop&w=1200&q=80",
          ownerName: "La Dolfina Stud",
          damName: "Roseta I",
          sireName: "Escorpión",
          reservePriceCents: 4800000,
          currency: "USD",
          breed: "Polo Argentino",
          sex: "Mare",
          ageYears: 5,
          coatColor: "Chestnut",
          contactPhone: "+54 9 11 4588 1200",
          contactEmail: "sales@ladolfina.com"
        },
        {
          lotNumber: 12,
          horseName: "LD Eclipse",
          imageUrl: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
          ownerName: "La Dolfina Stud",
          damName: "Luna Criolla",
          sireName: "Eclipse Star",
          reservePriceCents: 7200000,
          currency: "USD",
          breed: "Thoroughbred x Criollo",
          sex: "Stallion",
          ageYears: 7,
          coatColor: "Dark Bay",
          contactPhone: "+54 9 11 4588 1200",
          contactEmail: "sales@ladolfina.com"
        }
      ]
    },
    {
      slug: "pilar-golden-colts-auction-2026",
      title: "Pilar Golden Colts Auction",
      imageUrl: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1600&q=80",
      organizer: "Pilar Polo Association",
      venue: "Pilar Polo Grounds",
      city: "Pilar",
      country: "Argentina",
      eventDate: new Date(Date.UTC(2026, 10, 6, 17, 30, 0)),
      contactName: "Franco Larrain",
      contactPhone: "+54 9 11 6033 2102",
      contactEmail: "franco@pilarpolo.org",
      websiteUrl: "https://www.pilarpolo.com/",
      notes: "Evento enfocado en caballos jovenes y yeguas de proyeccion para torneos medianos y altos.",
      horses: [
        {
          lotNumber: 3,
          horseName: "Pilar Golden Dust",
          imageUrl: "https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=1200&q=80",
          ownerName: "Estancia San Lucas",
          damName: "Golden Breeze",
          sireName: "Dust Rider",
          reservePriceCents: 3900000,
          currency: "USD",
          breed: "Polo Argentino",
          sex: "Mare",
          ageYears: 4,
          coatColor: "Grey",
          contactPhone: "+54 9 11 6033 2102",
          contactEmail: "franco@pilarpolo.org"
        },
        {
          lotNumber: 8,
          horseName: "Pilar Falcon",
          imageUrl: "https://images.unsplash.com/photo-1586466200437-6f2f3f9b0ed7?auto=format&fit=crop&w=1200&q=80",
          ownerName: "Haras La Esperanza",
          damName: "Falcon Lady",
          sireName: "High Falcon",
          reservePriceCents: 3100000,
          currency: "USD",
          breed: "Thoroughbred",
          sex: "Gelding",
          ageYears: 5,
          coatColor: "Bay",
          contactPhone: "+54 9 11 4770 3400",
          contactEmail: "contacto@hararesperanza.com"
        },
        {
          lotNumber: 11,
          horseName: "Pilar South Wind",
          imageUrl: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1200&q=80",
          ownerName: "Santa Maria Polo Farm",
          damName: "South Queen",
          sireName: "Wind Storm",
          reservePriceCents: 4550000,
          currency: "USD",
          breed: "Polo Argentino",
          sex: "Mare",
          ageYears: 6,
          coatColor: "Brown",
          contactPhone: "+54 9 11 5222 8970",
          contactEmail: "ventas@santamariapolo.com"
        }
      ]
    }
  ] as const;

  for (const event of auctionEvents) {
    const upsertedEvent = await prisma.horseAuctionEvent.upsert({
      where: { slug: event.slug },
      update: {
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
        deletedAt: null
      },
      create: {
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
        notes: event.notes
      }
    });

    await prisma.horseAuctionHorse.deleteMany({ where: { eventId: upsertedEvent.id } });
    await prisma.horseAuctionHorse.createMany({
      data: event.horses.map((horse) => ({
        eventId: upsertedEvent.id,
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
        ,damName: horse.damName
        ,sireName: horse.sireName
      }))
    });
  }

  const eventCount = await prisma.horseAuctionEvent.count({ where: { deletedAt: null } });
  const horseCount = await prisma.horseAuctionHorse.count();
  console.log(`Horse auctions seeded: ${eventCount} events, ${horseCount} horses.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
