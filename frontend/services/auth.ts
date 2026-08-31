import { Platform } from "react-native";

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  avatarUrl?: string;
  roles: string[];
};

export type SignInPayload = {
  identifier: string;
  password: string;
};

export type SignUpPayload = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
};

export type GoogleSignInPayload = {
  accessToken: string;
};

export type AppleSignInPayload = {
  identityToken: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

const DEMO_SEED_PASSWORD = "PoloConnect123!";

const DEMO_SEED_USERS: Record<string, AuthUser> = {
  "polo.connect": {
    id: "demo-seed-polo-connect",
    firstName: "Adrian",
    lastName: "Clark",
    email: "adrian@poloconnect.app",
    username: "polo.connect",
    phone: "+541145567890",
    roles: ["player", "seller", "organizer", "admin", "superadmin"]
  },
  "adrian@poloconnect.app": {
    id: "demo-seed-polo-connect",
    firstName: "Adrian",
    lastName: "Clark",
    email: "adrian@poloconnect.app",
    username: "polo.connect",
    phone: "+541145567890",
    roles: ["player", "seller", "organizer", "admin", "superadmin"]
  },
  "admin@poloconnect.app": {
    id: "demo-seed-admin-panel",
    firstName: "Panel",
    lastName: "Admin",
    email: "admin@poloconnect.app",
    username: "admin.panel",
    phone: "+541145567891",                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
    roles: ["player", "admin"]
  },
  "admin.panel": {
    id: "demo-seed-admin-panel",
    firstName: "Panel",
    lastName: "Admin",
    email: "admin@poloconnect.app",
    username: "admin.panel",
    phone: "+541145567891",
    roles: ["player", "admin"]
  }
};

function shouldUseDemoFallback(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    message.includes("no se pudo completar la solicitud") ||
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("requesttimeout") ||
    message.includes("bad gateway")
  );
}

function canUseDemoFallback() {
  if (process.env.EXPO_PUBLIC_ENABLE_DEMO_AUTH_FALLBACK === "true") {
    return true;
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
  const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(apiUrl);
  const isDev = typeof __DEV__ !== "undefined" && __DEV__;

  return isDev && isLocalApi && Platform.OS !== "web";
}

export async function authenticateWithPassword({ identifier, password }: SignInPayload) {
  const { login } = await import("@/services/api/auth");

  const normalizedIdentifier = identifier.trim();
  const normalizedKey = normalizedIdentifier.toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedIdentifier || !normalizedPassword) {
    throw new Error("Completa usuario o mail y contraseña.");
  }

  try {
    return await login({ identifier: normalizedIdentifier, password });
  } catch (error) {
    const fallbackUser = DEMO_SEED_USERS[normalizedKey];

    if (fallbackUser && normalizedPassword === DEMO_SEED_PASSWORD && canUseDemoFallback() && shouldUseDemoFallback(error)) {
      return fallbackUser;
    }

    throw error;
  }
}

export async function registerWithPassword(payload: SignUpPayload) {
  const { register } = await import("@/services/api/auth");

  return register({
    ...payload,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: payload.email.trim().toLowerCase(),
    username: payload.username.trim(),
    phone: payload.phone?.trim() || undefined
  });
}

export async function authenticateWithGoogle({ accessToken }: GoogleSignInPayload) {
  const { loginWithGoogle } = await import("@/services/api/auth");

  return loginWithGoogle(accessToken.trim());
}

export async function authenticateWithApple(payload: AppleSignInPayload) {
  const { loginWithApple } = await import("@/services/api/auth");

  return loginWithApple({
    identityToken: payload.identityToken.trim(),
    email: payload.email?.trim() || undefined,
    firstName: payload.firstName?.trim() || undefined,
    lastName: payload.lastName?.trim() || undefined
  });
}
