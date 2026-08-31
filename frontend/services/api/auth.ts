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

type RawAuthResponse = Partial<AuthResponse> & {
  data?: Partial<AuthResponse>;
  tokens?: Partial<ApiTokenFields>;
};

type ApiTokenFields = Pick<AuthResponse, "accessToken"> & Partial<Pick<AuthResponse, "refreshToken" | "csrfToken">>;

function normalizeAuthResponse(response: RawAuthResponse): AuthResponse {
  const accessToken = response.accessToken ?? response.tokens?.accessToken ?? response.data?.accessToken;
  const refreshToken = response.refreshToken ?? response.tokens?.refreshToken ?? response.data?.refreshToken;
  const csrfToken = response.csrfToken ?? response.tokens?.csrfToken ?? response.data?.csrfToken;
  const user = response.user ?? response.data?.user;

  console.info(`login response has accessToken: ${Boolean(accessToken)}`);
  console.info(`login response has refreshToken: ${Boolean(refreshToken)}`);

  if (!accessToken) {
    console.info("setAuthTokens called: false");
    throw new Error("El login no devolvió accessToken.");
  }

  if (!user) {
    throw new Error("El login no devolvió usuario.");
  }

  return { accessToken, refreshToken, csrfToken, user };
}

async function persistAuthResponse(response: RawAuthResponse) {
  const normalizedResponse = normalizeAuthResponse(response);
  await setAuthTokens(normalizedResponse);
  return normalizedResponse.user;
}

export async function login(payload: SignInPayload) {
  const response = await apiRequest<RawAuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return persistAuthResponse(response);
}

export async function register(payload: SignUpPayload) {
  const response = await apiRequest<RawAuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return persistAuthResponse(response);
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
    return persistAuthResponse(response);
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
  const response = await apiRequest<RawAuthResponse>("/auth/login/google", {
    method: "POST",
    body: JSON.stringify({ accessToken })
  });

  return persistAuthResponse(response);
}

export async function loginWithApple(payload: {
  identityToken: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}) {
  const response = await apiRequest<RawAuthResponse>("/auth/login/apple", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return persistAuthResponse(response);
}
