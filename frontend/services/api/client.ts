import Constants from "expo-constants";
import { Platform } from "react-native";
import { getAuthStorageItem, setAuthStorageItem } from "@/services/auth-storage";

export type ApiTokens = {
  accessToken: string;
  refreshToken?: string;
  csrfToken?: string;
};

type ApiRequestInit = RequestInit & {
  skipAuth?: boolean;
};

export type SessionInvalidReason =
  | "access_token_rejected"
  | "access_token_rejected_after_refresh"
  | "manual_logout"
  | "refresh_token_invalid"
  | "session_storage_invalid";

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
const isDev = typeof __DEV__ !== "undefined" && __DEV__;

function resolveApiUrl() {
  if (envApiUrl) {
    return envApiUrl;
  }

  if (isDev) {
    return defaultApiUrl;
  }

  return null;
}

// Always prefer explicit env URL. Only local development may fall back to the dev server host.
const apiUrl = resolveApiUrl();
const localApiUrlPattern = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?/i;
export const isApiUrlConfigured = Boolean(apiUrl) && (isDev || !localApiUrlPattern.test(apiUrl ?? ""));
console.info(`startup/api-config: ${isApiUrlConfigured}`);

const missingApiUrlError = "No pudimos conectar con el servicio. Intentá nuevamente más tarde.";

function requireApiUrl() {
  if (!apiUrl || !isApiUrlConfigured) {
    console.error(
      "Missing or invalid EXPO_PUBLIC_API_URL for production build. Configure it in the EAS production environment before building."
    );
    throw new Error(missingApiUrlError);
  }

  return apiUrl;
}

const apiOrigin = apiUrl?.replace(/\/api(?:\/.*)?$/, "") ?? "";
const apiPathPrefix = apiUrl ? apiUrl.slice(apiOrigin.length).replace(/\/$/, "") || "/api/v1" : "/api/v1";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let csrfToken: string | null = null;
let refreshPromise: { sessionVersion: number; refreshToken: string; promise: Promise<void> } | null = null;
let authTokensHydrated = false;
let authTokensHydrationPromise: Promise<void> | null = null;
let sessionInvalidHandler: ((reason: SessionInvalidReason) => void) | null = null;
let authSessionVersion = 0;

export function setSessionInvalidHandler(handler: ((reason: SessionInvalidReason) => void) | null) {
  sessionInvalidHandler = handler;
}

function notifySessionInvalid(reason: SessionInvalidReason) {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.info(`[AUTH] session invalidated: ${reason}`);
  }
  sessionInvalidHandler?.(reason);
}

function isSameAuthSession(version: number) {
  return authSessionVersion === version;
}

function isCurrentAccessToken(version: number, token: string | null) {
  return isSameAuthSession(version) && accessToken === token;
}

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
  authSessionVersion += 1;
  await Promise.all([
    setAuthStorageItem("pc_access_token", accessToken),
    setAuthStorageItem("pc_refresh_token", refreshToken),
    setAuthStorageItem("pc_csrf_token", csrfToken)
  ]);

  const persistedAccessToken = await getAuthStorageItem("pc_access_token");

  if (!persistedAccessToken) {
    await clearAuthTokens(true, "session_storage_invalid");
    throw new Error("No se pudo guardar el access token.");
  }
}

export async function clearAuthTokens(notifySession = false, reason: SessionInvalidReason = "manual_logout") {
  accessToken = null;
  refreshToken = null;
  csrfToken = null;
  authTokensHydrated = true;
  authSessionVersion += 1;
  await Promise.all([
    setAuthStorageItem("pc_access_token", null),
    setAuthStorageItem("pc_refresh_token", null),
    setAuthStorageItem("pc_csrf_token", null)
  ]);

  if (notifySession) {
    notifySessionInvalid(reason);
  }
}

export function getApiUrl() {
  return requireApiUrl();
}

export function getApiOrigin() {
  requireApiUrl();
  return apiOrigin;
}

export function getSocketUrl() {
  requireApiUrl();
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

async function refreshAccessToken(tokenToRefresh: string, requestSessionVersion: number, requestAccessToken: string | null) {
  if (!tokenToRefresh) {
    throw new Error("No hay sesión activa.");
  }

  const response = await fetch(`${requireApiUrl()}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: tokenToRefresh })
  });

  if (!response.ok) {
    if (isSameAuthSession(requestSessionVersion) && refreshToken === tokenToRefresh) {
      await clearAuthTokens(true, "refresh_token_invalid");
    }
    throw new Error("La sesión expiró. Iniciá sesión nuevamente.");
  }

  const data = await response.json();
  if (!isSameAuthSession(requestSessionVersion) || refreshToken !== tokenToRefresh) {
    return;
  }

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

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}, retry = true): Promise<T> {
  await hydrateAuthTokens();
  const { skipAuth = false, ...fetchInit } = init;
  const requestApiUrl = requireApiUrl();
  const requestAccessToken = skipAuth ? null : accessToken;
  const requestRefreshToken = skipAuth ? null : refreshToken;
  const requestSessionVersion = authSessionVersion;

  const headers = new Headers(fetchInit.headers);

  if (typeof fetchInit.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (requestAccessToken) {
    headers.set("Authorization", `Bearer ${requestAccessToken}`);
  }

  const method = String(fetchInit.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const fallbackCsrf = csrfToken ?? readCookie("pc_csrf");
    if (fallbackCsrf) {
      headers.set("x-csrf-token", fallbackCsrf);
    }
  }

  const response = await fetch(`${requestApiUrl}${path}`, { ...fetchInit, headers, credentials: "include" });

  if (
    response.status === 401 &&
    requestAccessToken &&
    requestRefreshToken &&
    retry &&
    isSameAuthSession(requestSessionVersion)
  ) {
    if (refreshToken !== requestRefreshToken) {
      return apiRequest<T>(path, init, false);
    }

    if (
      !refreshPromise ||
      refreshPromise.sessionVersion !== requestSessionVersion ||
      refreshPromise.refreshToken !== requestRefreshToken
    ) {
      refreshPromise = {
        sessionVersion: requestSessionVersion,
        refreshToken: requestRefreshToken,
        promise: refreshAccessToken(requestRefreshToken, requestSessionVersion, requestAccessToken).finally(() => {
          if (refreshPromise?.sessionVersion === requestSessionVersion && refreshPromise.refreshToken === requestRefreshToken) {
            refreshPromise = null;
          }
        })
      };
    }
    await refreshPromise.promise;
    if (!isSameAuthSession(requestSessionVersion)) {
      throw new Error(await parseError(response));
    }
    return apiRequest<T>(path, init, false);
  }

  if (response.status === 401 && requestAccessToken && isCurrentAccessToken(requestSessionVersion, requestAccessToken)) {
    await clearAuthTokens(true, retry ? "access_token_rejected" : "access_token_rejected_after_refresh");
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
