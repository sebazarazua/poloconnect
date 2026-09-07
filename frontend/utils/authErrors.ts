type AuthErrorKey =
  | "auth.login.accountNotFound"
  | "auth.login.invalidCredentials"
  | "auth.login.accountLocked"
  | "auth.login.error"
  | "auth.register.accountExists"
  | "auth.register.error"
  | "auth.oauth.error";

type Translate = (key: AuthErrorKey, params?: Record<string, string | number>) => string;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export function getLoginErrorMessage(error: unknown, t: Translate) {
  switch (errorMessage(error)) {
    case "AUTH_ACCOUNT_NOT_FOUND":
      return t("auth.login.accountNotFound");
    case "AUTH_INVALID_PASSWORD":
    case "Invalid credentials.":
      return t("auth.login.invalidCredentials");
    case "AUTH_ACCOUNT_LOCKED":
    case "Account temporarily locked. Try again later.":
      return t("auth.login.accountLocked");
    default:
      return t("auth.login.error");
  }
}

export function getRegisterErrorMessage(error: unknown, t: Translate) {
  switch (errorMessage(error)) {
    case "AUTH_ACCOUNT_ALREADY_EXISTS":
    case "Email or username already exists.":
      return t("auth.register.accountExists");
    default:
      return t("auth.register.error");
  }
}

export function getOAuthErrorMessage(provider: "Apple" | "Google", t: Translate) {
  return t("auth.oauth.error", { provider });
}