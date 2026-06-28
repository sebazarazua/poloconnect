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

export async function authenticateWithPassword({ identifier, password }: SignInPayload) {
  const { login } = await import("@/services/api/auth");

  const normalizedIdentifier = identifier.trim();

  if (!normalizedIdentifier || !password.trim()) {
    throw new Error("Completa usuario o mail y contraseña.");
  }

  return login({ identifier: normalizedIdentifier, password });
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