import { apiRequest, clearAuthTokens, setAuthTokens } from "@/services/api/client";
import type { AuthUser, SignInPayload, SignUpPayload } from "@/services/auth";

type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  csrfToken?: string;
  user: AuthUser;
};

type PasswordResetConfirmResponse =
  | { ok: boolean }
  | {
      accessToken: string;
      refreshToken?: string;
      csrfToken?: string;
      user: AuthUser;
    };

async function persistAuthResponse(response: AuthResponse) {
  if (!response.accessToken) {
    throw new Error("El login no devolvió accessToken.");
  }

  await setAuthTokens(response);
}

export async function login(payload: SignInPayload) {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  await persistAuthResponse(response);
  return response.user;
}

export async function register(payload: SignUpPayload) {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  await persistAuthResponse(response);
  return response.user;
}

export async function getCurrentUser() {
  return apiRequest<AuthUser>("/auth/me");
}

export async function logout() {
  try {
    await apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
  } finally {
    await clearAuthTokens();
  }
}

export async function requestPasswordReset(email: string) {
  return apiRequest<{ ok: boolean }>("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export async function confirmPasswordReset(payload: { email: string; code: string; newPassword: string }) {
  const response = await apiRequest<PasswordResetConfirmResponse>("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if ("accessToken" in response) {
    await persistAuthResponse(response);
    return response.user;
  }

  return null;
}

export async function changeMyPassword(payload: { currentPassword: string; newPassword: string }) {
  return apiRequest<{ ok: boolean }>("/auth/me/password", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function loginWithGoogle(accessToken: string) {
  const response = await apiRequest<AuthResponse>("/auth/login/google", {
    method: "POST",
    body: JSON.stringify({ accessToken })
  });

  await persistAuthResponse(response);
  return response.user;
}

export async function loginWithApple(payload: {
  identityToken: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}) {
  const response = await apiRequest<AuthResponse>("/auth/login/apple", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  await persistAuthResponse(response);
  return response.user;
}
