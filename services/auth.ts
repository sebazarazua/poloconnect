export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
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

const baseDemoUser: AuthUser = {
  id: "demo-user",
  firstName: "Adrian",
  lastName: "Suarez",
  email: "adrian@poloconnect.app",
  username: "polo.connect"
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function authenticateWithPassword({ identifier, password }: SignInPayload) {
  await delay(350);

  const normalizedIdentifier = identifier.trim();

  if (!normalizedIdentifier || !password.trim()) {
    throw new Error("Completa usuario o mail y contraseña.");
  }

  return {
    ...baseDemoUser,
    email: normalizedIdentifier.includes("@") ? normalizedIdentifier : baseDemoUser.email,
    username: normalizedIdentifier.includes("@") ? baseDemoUser.username : normalizedIdentifier
  };
}

export async function registerWithPassword(payload: SignUpPayload) {
  await delay(450);

  return {
    id: `demo-${payload.username.trim().toLowerCase()}`,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: payload.email.trim().toLowerCase(),
    username: payload.username.trim(),
    phone: payload.phone?.trim() || undefined
  };
}