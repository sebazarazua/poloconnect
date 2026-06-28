import Constants from "expo-constants";
import { Platform } from "react-native";

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
const apiUrlCandidates = [envApiUrl, defaultApiUrl].filter(
  (url, index, array): url is string => Boolean(url) && array.indexOf(url) === index
);
let apiUrl = apiUrlCandidates[0] ?? defaultApiUrl;

let accessToken: string | null = null;
let refreshToken: string | null = null;
let csrfToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

function readSessionStorage(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionStorage(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.sessionStorage.setItem(key, value);
    } else {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors.
  }
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

accessToken = readSessionStorage("pc_access_token");
refreshToken = readSessionStorage("pc_refresh_token");
csrfToken = readSessionStorage("pc_csrf_token") ?? readCookie("pc_csrf");

export function setAuthTokens(tokens: ApiTokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken ?? refreshToken;
  csrfToken = tokens.csrfToken ?? csrfToken;
  writeSessionStorage("pc_access_token", accessToken);
  writeSessionStorage("pc_refresh_token", refreshToken);
  writeSessionStorage("pc_csrf_token", csrfToken);
}

export function clearAuthTokens() {
  accessToken = null;
  refreshToken = null;
  csrfToken = null;
  writeSessionStorage("pc_access_token", null);
  writeSessionStorage("pc_refresh_token", null);
  writeSessionStorage("pc_csrf_token", null);
}

export function getApiUrl() {
  return apiUrl;
}

async function fetchWithApiFallback(path: string, init: RequestInit) {
  let lastError: unknown = null;

  for (const candidate of apiUrlCandidates) {
    try {
      const response = await fetch(`${candidate}${path}`, init);
      apiUrl = candidate;
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Network request failed");
}

async function refreshAccessToken() {
  if (!refreshToken) {
    throw new Error("No hay sesión activa.");
  }

  const response = await fetchWithApiFallback("/auth/refresh", {
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
  writeSessionStorage("pc_access_token", accessToken);
  writeSessionStorage("pc_refresh_token", refreshToken);
  writeSessionStorage("pc_csrf_token", csrfToken);
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

  const response = await fetchWithApiFallback(path, { ...init, headers, credentials: "include" });

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
