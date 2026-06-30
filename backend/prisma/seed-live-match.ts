import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const clubs = await Promise.all(
    [
      "Tortugas Club",
      "Hurlingham Club",
      "Campo Argentino de Polo",
      "Belgrano Athletic Club",
      "San Benito Club",
      "Pilar Polo",
      "La Ensenada"
    ].map((name) =>
      prisma.club.upsert({
        where: { slug: slug(name) },
        update: {},
        create: {
          name,
          slug: slug(name),
          location: "Buenos Aires, Argentina"
        }
      })
    )
  );

  const teamNames = ["La Dolfina", "Ellerstina"] as const;
  const teams = new Map<string, Awaited<ReturnType<typeof prisma.team.upsert>>>();
  for (const name of teamNames) {
    teams.set(
      name,
      await prisma.team.upsert({
        where: { slug: slug(name) },
        update: {},
        create: { name, slug: slug(name), clubId: clubs[0].id }
      })
    );
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

  const match = await prisma.match.upsert({
    where: { externalCode: "2-1" },
    update: {
      status: "live",
      score1: 5,
      score2: 3,
      currentChukker: 3,
      totalChukkers: 6,
      competitionName: "129° Abierto Argentino de Polo",
      scheduledAt: new Date(Date.UTC(2026, 5, 2, 14, 0, 0)),
      deletedAt: null
    },
    create: {
      externalCode: "2-1",
      tournamentId: tournament.id,
      clubId: clubs[0].id,
      team1Id: teams.get("La Dolfina")!.id,
      team2Id: teams.get("Ellerstina")!.id,
      scheduledAt: new Date(Date.UTC(2026, 5, 2, 14, 0, 0)),
      status: "live",
      score1: 5,
      score2: 3,
      currentChukker: 3,
      totalChukkers: 6,
      competitionName: "129° Abierto Argentino de Polo",
      youtubeUrl: "https://www.youtube.com/live/zY3JUrfPtTo"
    }
  });

  const playerNames = [
    "Adolfo Cambiaso",
    "David Stirling",
    "Juan Martin Nero",
    "Pablo Mac Donough",
    "Gonzalo Pieres Jr.",
    "Facundo Pieres",
    "Nicolas Pieres",
    "Mariano Aguerre"
  ] as const;

  const players = [] as Array<{ id: string }>;
  for (const name of playerNames) {
    const existingPlayer = await prisma.player.findFirst({ where: { displayName: name, deletedAt: null } });
    const player =
      existingPlayer ??
      (await prisma.player.create({
        data: { displayName: name, handicap: 10 }
      }));
    players.push({ id: player.id });
  }

  for (let index = 0; index < 8; index += 1) {
    const teamId = index < 4 ? teams.get("La Dolfina")!.id : teams.get("Ellerstina")!.id;
    await prisma.matchLineup.upsert({
      where: {
        matchId_teamId_position: {
          matchId: match.id,
          teamId,
          position: (index % 4) + 1
        }
      },
      update: {
        playerId: players[index].id,
        shirtNumber: (index % 4) + 1,
        goalsLabel: index < 6 ? "+1 goles" : "0 goles"
      },
      create: {
        matchId: match.id,
        teamId,
        playerId: players[index].id,
        position: (index % 4) + 1,
        shirtNumber: (index % 4) + 1,
        goalsLabel: index < 6 ? "+1 goles" : "0 goles"
      }
    });
  }

  for (const stat of [
    ["goals", "Goles", "5", "3", 62, 38],
    ["shots", "Tiros al arco", "12", "8", 60, 40],
    ["fouls", "Faltas", "4", "6", 40, 60]
  ] as const) {
    await prisma.matchStat.upsert({
      where: { matchId_statKey: { matchId: match.id, statKey: stat[0] } },
      update: {
        label: stat[1],
        team1Value: stat[2],
        team2Value: stat[3],
        team1Percent: stat[4],
        team2Percent: stat[5]
      },
      create: {
        matchId: match.id,
        statKey: stat[0],
        label: stat[1],
        team1Value: stat[2],
        team2Value: stat[3],
        team1Percent: stat[4],
        team2Percent: stat[5]
      }
    });
  }

  await prisma.matchEvent.upsert({
    where: { matchId_eventNumber: { matchId: match.id, eventNumber: BigInt(1) } },
    update: {
      eventType: "goal",
      matchClock: "72:00",
      title: "Gol de La Dolfina",
      body: "Adolfo Cambiaso convierte desde mitad de cancha."
    },
    create: {
      matchId: match.id,
      eventNumber: BigInt(1),
      eventType: "goal",
      matchClock: "72:00",
      title: "Gol de La Dolfina",
      body: "Adolfo Cambiaso convierte desde mitad de cancha."
    }
  });

  console.log("Partido en vivo sembrado correctamente (externalCode=2-1).");
}

main().finally(async () => prisma.$disconnect());
