import Constants from "expo-constants";
import { Platform } from "react-native";
import { getAuthStorageItem, setAuthStorageItem } from "@/services/auth-storage";

export type ApiTokens = {
  accessToken: string;
  refreshToken?: string;
  csrfToken?: string;
};

function getDefaultApiUrl() {
  if (Platform.OS === "web") {
    return "http://localhost:4000/api/v1";
  }

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.linkingUri?.replace(/^\w+:\/\//, "");
  const host = hostUri?.split(":")[0];

  return host ? `http://${host}:4000/api/v1` : "http://localhost:4000/api/v1";
}

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const defaultApiUrl = getDefaultApiUrl().replace(/\/$/, "");
// Always prefer explicit env URL to avoid tunnel host-derived API URLs on mobile.
const apiUrl = envApiUrl ?? defaultApiUrl;
const apiOrigin = apiUrl.replace(/\/api(?:\/.*)?$/, "");
const apiPathPrefix = apiUrl.slice(apiOrigin.length).replace(/\/$/, "") || "/api/v1";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let csrfToken: string | null = null;
let refreshPromise: Promise<void> | null = null;
let authTokensHydrated = false;
let authTokensHydrationPromise: Promise<void> | null = null;

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

export async function hydrateAuthTokens() {
  if (authTokensHydrated) return;

  authTokensHydrationPromise ??= Promise.all([
    getAuthStorageItem("pc_access_token"),
    getAuthStorageItem("pc_refresh_token"),
    getAuthStorageItem("pc_csrf_token")
  ])
    .then(([storedAccessToken, storedRefreshToken, storedCsrfToken]) => {
      accessToken = storedAccessToken;
      refreshToken = storedRefreshToken;
      csrfToken = storedCsrfToken ?? readCookie("pc_csrf");
      authTokensHydrated = true;
    })
    .finally(() => {
      authTokensHydrationPromise = null;
    });

  await authTokensHydrationPromise;
}

export async function setAuthTokens(tokens: ApiTokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken ?? refreshToken;
  csrfToken = tokens.csrfToken ?? csrfToken;
  authTokensHydrated = true;
  await Promise.all([
    setAuthStorageItem("pc_access_token", accessToken),
    setAuthStorageItem("pc_refresh_token", refreshToken),
    setAuthStorageItem("pc_csrf_token", csrfToken)
  ]);
}

export async function clearAuthTokens() {
  accessToken = null;
  refreshToken = null;
  csrfToken = null;
  authTokensHydrated = true;
  await Promise.all([
    setAuthStorageItem("pc_access_token", null),
    setAuthStorageItem("pc_refresh_token", null),
    setAuthStorageItem("pc_csrf_token", null)
  ]);
}

export function getApiUrl() {
  return apiUrl;
}

export function getApiOrigin() {
  return apiOrigin;
}

export function getSocketUrl() {
  return `${apiOrigin}/ws`;
}

export function resolveApiMediaUrl(url?: string | null) {
  if (!url) return undefined;

  const normalizePath = (value: string) => {
    if (value.startsWith("/api/")) return value;
    if (value.startsWith("/media/")) return `${apiPathPrefix}${value}`;
    return value;
  };

  if (/^https?:\/\//i.test(url)) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?/i.test(url)) {
      try {
        const parsed = new URL(url);
        const normalizedPath = normalizePath(parsed.pathname);
        return `${apiOrigin}${normalizedPath}${parsed.search}${parsed.hash}`;
      } catch {
        return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?/i, apiOrigin);
      }
    }

    return url;
  }

  const path = url.startsWith("/") ? url : `/${url}`;
  return `${apiOrigin}${normalizePath(path)}`;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  if (!refreshToken) {
    throw new Error("No hay sesión activa.");
  }

  const response = await fetch(`${apiUrl}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    clearAuthTokens();
    throw new Error("La sesión expiró. Iniciá sesión nuevamente.");
  }

  const data = await response.json();
  accessToken = data.accessToken;
  refreshToken = data.refreshToken ?? refreshToken;
  csrfToken = data.csrfToken ?? csrfToken;
  await Promise.all([
    setAuthStorageItem("pc_access_token", accessToken),
    setAuthStorageItem("pc_refresh_token", refreshToken),
    setAuthStorageItem("pc_csrf_token", csrfToken)
  ]);
}

async function parseError(response: Response) {
  try {
    const payload = await response.json();
    const message = payload?.error?.message ?? payload?.message;
    if (Array.isArray(message)) return message.join(" ");
    if (message) return String(message);
  } catch {
    // Ignore JSON parsing failures and fall back to the status text.
  }

  return response.statusText || "No se pudo completar la solicitud.";
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  await hydrateAuthTokens();

  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const method = String(init.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const fallbackCsrf = csrfToken ?? readCookie("pc_csrf");
    if (fallbackCsrf) {
      headers.set("x-csrf-token", fallbackCsrf);
    }
  }

  const response = await fetch(`${apiUrl}${path}`, { ...init, headers, credentials: "include" });

  if (response.status === 401 && refreshToken && retry) {
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    await refreshPromise;
    return apiRequest<T>(path, init, false);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
