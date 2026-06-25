import { apiRequest, clearAuthTokens, setAuthTokens } from "@/services/api/client";
import type { AuthUser, SignInPayload, SignUpPayload } from "@/services/auth";

type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  csrfToken?: string;
  user: AuthUser;
};

export async function login(payload: SignInPayload) {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  setAuthTokens(response);
  return response.user;
}

export async function register(payload: SignUpPayload) {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  setAuthTokens(response);
  return response.user;
}

export async function getCurrentUser() {
  return apiRequest<AuthUser>("/auth/me");
}

export async function logout() {
  try {
    await apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
  } finally {
    clearAuthTokens();
  }
}
