import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "adrian@poloconnect.app";
const ADMIN_USERNAME = "polo.connect";
const ADMIN_FIRST_NAME = "Adrian";
const ADMIN_LAST_NAME = "Suarez";
const ADMIN_PHONE = "+541145567890";
const REQUIRED_ROLES = [
  { code: "admin", name: "Admin" },
  { code: "superadmin", name: "Super Admin" }
];

function isApplyMode() {
  return process.argv.includes("--apply");
}

function getBootstrapPassword() {
  const password = process.env.POLO_CONNECT_BOOTSTRAP_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("Missing POLO_CONNECT_BOOTSTRAP_ADMIN_PASSWORD.");
  }

  if (password.length < 12) {
    throw new Error("POLO_CONNECT_BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.");
  }

  return password;
}

async function findTargetUser() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: ADMIN_EMAIL },
        { username: ADMIN_USERNAME }
      ]
    },
    include: {
      credential: true,
      roles: { include: { role: true } },
      settings: true
    }
  });

  const ids = new Set(users.map((user) => user.id));

  if (ids.size > 1) {
    throw new Error(
      `Abort: ${ADMIN_EMAIL} and ${ADMIN_USERNAME} belong to different users. ` +
        "Resolve that manually before running this bootstrap."
    );
  }

  return users[0] ?? null;
}

async function main() {
  const apply = isApplyMode();
  const password = getBootstrapPassword();
  const existingUser = await findTargetUser();
  const existingRoleCodes = new Set(existingUser?.roles.map((entry) => entry.role.code) ?? []);

  const actions = [
    existingUser ? `update existing user ${existingUser.id}` : "create one user",
    `ensure email=${ADMIN_EMAIL}`,
    `ensure username=${ADMIN_USERNAME}`,
    "ensure status=active and deletedAt=null",
    "upsert AuthCredential with argon2.hash(password)",
    "reset failedLoginCount=0 and lockedUntil=null",
    `ensure roles=${REQUIRED_ROLES.map((role) => role.code).join(",")}`,
    existingUser?.settings ? "leave existing UserSettings unchanged" : "create UserSettings for this user only"
  ];

  console.log(`Mode: ${apply ? "APPLY" : "DRY_RUN"}`);
  console.log("Bootstrap target:");
  console.log(`- email: ${ADMIN_EMAIL}`);
  console.log(`- username: ${ADMIN_USERNAME}`);
  console.log(`- existingUserId: ${existingUser?.id ?? "none"}`);
  console.log("- actions:");
  actions.forEach((action) => console.log(`  - ${action}`));
  console.log("- will not create demo clubs, teams, tournaments, products, horses, or communities");
  console.log("- will not delete or modify other users/data");

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to write these changes.");
    return;
  }

  const passwordHash = await argon2.hash(password);

  const result = await prisma.$transaction(async (tx) => {
    const roles = await Promise.all(
      REQUIRED_ROLES.map((role) =>
        tx.role.upsert({
          where: { code: role.code },
          update: {},
          create: role
        })
      )
    );

    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: existingUser.firstName || ADMIN_FIRST_NAME,
            lastName: existingUser.lastName || ADMIN_LAST_NAME,
            email: ADMIN_EMAIL,
            username: ADMIN_USERNAME,
            phone: existingUser.phone || ADMIN_PHONE,
            status: "active",
            deletedAt: null,
            credential: {
              upsert: {
                update: {
                  passwordHash,
                  passwordUpdatedAt: new Date(),
                  failedLoginCount: 0,
                  lockedUntil: null
                },
                create: { passwordHash }
              }
            },
            settings: existingUser.settings ? undefined : { create: {} }
          },
          include: { roles: { include: { role: true } }, credential: true, settings: true }
        })
      : await tx.user.create({
          data: {
            firstName: ADMIN_FIRST_NAME,
            lastName: ADMIN_LAST_NAME,
            email: ADMIN_EMAIL,
            username: ADMIN_USERNAME,
            phone: ADMIN_PHONE,
            status: "active",
            credential: { create: { passwordHash } },
            settings: { create: {} }
          },
          include: { roles: { include: { role: true } }, credential: true, settings: true }
        });

    for (const role of roles) {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id }
      });
    }

    return tx.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { roles: { include: { role: true } }, credential: true, settings: true }
    });
  });

  const nextRoleCodes = result.roles.map((entry) => entry.role.code).sort();

  console.log("Bootstrap complete:");
  console.log(`- userId: ${result.id}`);
  console.log(`- email: ${result.email}`);
  console.log(`- username: ${result.username}`);
  console.log(`- status: ${result.status}`);
  console.log(`- deletedAt: ${result.deletedAt ? "present" : "null"}`);
  console.log(`- credential: ${result.credential ? "present" : "missing"}`);
  console.log(`- settings: ${result.settings ? "present" : "missing"}`);
  console.log(`- roles before: ${Array.from(existingRoleCodes).sort().join(",") || "none"}`);
  console.log(`- roles after: ${nextRoleCodes.join(",")}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
