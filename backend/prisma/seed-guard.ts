const PRODUCTION_DEMO_SEED_FLAG = "ALLOW_PRODUCTION_DEMO_SEED";

export function assertDemoSeedAllowed(seedName: string) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (process.env[PRODUCTION_DEMO_SEED_FLAG] === "true") {
    return;
  }

  throw new Error(
    `${seedName} contains demo or destructive data and is blocked in production. ` +
      `Set ${PRODUCTION_DEMO_SEED_FLAG}=true only for an intentional, controlled production operation.`
  );
}
