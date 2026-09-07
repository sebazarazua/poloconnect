import { PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from "react";
import {
  authenticateWithApple,
  authenticateWithGoogle,
  authenticateWithPassword,
  registerWithPassword,
  type AuthUser,
  type AppleSignInPayload,
  type GoogleSignInPayload,
  type SignInPayload,
  type SignUpPayload
} from "@/services/auth";
import { getCurrentUser, logout as logoutApi } from "@/services/api/auth";
import { deleteMyAccount as deleteMyAccountApi } from "@/services/api/users";
import {
  clearAuthTokens,
  getAccessToken,
  hydrateAuthTokens,
  setSessionInvalidHandler,
  type SessionInvalidReason
} from "@/services/api/client";
import { getAuthStorageItem, setAuthStorageItem } from "@/services/auth-storage";
import { ActivityIndicator, Platform, View } from "react-native";

const AUTH_USER_STORAGE_KEY = "pc_auth_user";

function AuthHydrationSplash() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" }}>
      <ActivityIndicator size="large" color="#1f3b73" />
    </View>
  );
}

async function readStoredUser() {
  try {
    const raw = await getAuthStorageItem(AUTH_USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

async function writeStoredUser(user: AuthUser | null) {
  try {
    await setAuthStorageItem(AUTH_USER_STORAGE_KEY, user ? JSON.stringify(user) : null);
  } catch {
    // Ignore storage errors.
  }
}

type AuthContextValue = {
  authReady: boolean;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  user: AuthUser | null;
  signIn: (payload: SignInPayload) => Promise<void>;
  signInWithGoogle: (payload: GoogleSignInPayload) => Promise<void>;
  signInWithApple: (payload: AppleSignInPayload) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUser: (nextUser: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
type AuthStatus = "initializing" | "authenticated" | "unauthenticated";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasSessionToken, setHasSessionToken] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("initializing");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authOperationId = useRef(0);
  const isReady = authStatus !== "initializing";
  const isAuthenticated = authStatus === "authenticated" && user !== null && hasSessionToken;

  const clearLocalSession = async (reason: SessionInvalidReason = "manual_logout") => {
    authOperationId.current += 1;
    await Promise.all([clearAuthTokens(false, reason), writeStoredUser(null)]);
    setUser(null);
    setHasSessionToken(false);
    setAuthStatus("unauthenticated");
  };

  useEffect(() => {
    setSessionInvalidHandler((reason) => {
      authOperationId.current += 1;
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.info(`[AUTH] local session cleared: ${reason}`);
      }
      setUser(null);
      setHasSessionToken(false);
      setAuthStatus("unauthenticated");
      void writeStoredUser(null);
    });

    return () => {
      setSessionInvalidHandler(null);
    };
  }, []);

  const persistSignedInUser = async (nextUser: AuthUser) => {
    if (!getAccessToken()) {
      await clearLocalSession("session_storage_invalid");
      throw new Error("El login no dejó una sesión con access token.");
    }

    await writeStoredUser(nextUser);
    setUser(nextUser);
    setHasSessionToken(true);
    setAuthStatus("authenticated");
  };

  useEffect(() => {
    let cancelled = false;
    const operationId = authOperationId.current;

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.info("[AUTH] hydration started");
    }

    void (async () => {
      try {
        await hydrateAuthTokens();

        const storedUser = await readStoredUser();
        const hasToken = Boolean(getAccessToken());
        const isProductionWeb = Platform.OS === "web" && !(typeof __DEV__ !== "undefined" && __DEV__);
        const isDemoUser = storedUser?.id.startsWith("demo-seed-") ?? false;
        if (typeof __DEV__ !== "undefined" && __DEV__) {
          console.info(`[AUTH] storage loaded: user=${Boolean(storedUser)} token=${hasToken}`);
        }

        if (isProductionWeb && isDemoUser) {
          await clearLocalSession("session_storage_invalid");
          return null;
        }

        if (!hasToken) {
          await writeStoredUser(null);
          return null;
        }

        try {
          const currentUser = await getCurrentUser();
          await writeStoredUser(currentUser);
          return currentUser;
        } catch {
          if (!getAccessToken()) {
            await writeStoredUser(null);
            return null;
          }

          return storedUser;
        }
      } catch {
        return null;
      }
    })()
      .then((nextUser) => {
        if (cancelled || operationId !== authOperationId.current) return;
        const restored = Boolean(nextUser && getAccessToken());
        setUser(nextUser);
        setHasSessionToken(restored);
        setAuthStatus(restored ? "authenticated" : "unauthenticated");
      })
      .finally(() => {
        if (!cancelled && operationId === authOperationId.current) {
          setAuthStatus((current) => (current === "initializing" ? "unauthenticated" : current));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (payload: SignInPayload) => {
    const operationId = authOperationId.current + 1;
    authOperationId.current = operationId;
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithPassword(payload);
      if (authOperationId.current !== operationId) return;
      await persistSignedInUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithGoogle = async (payload: GoogleSignInPayload) => {
    const operationId = authOperationId.current + 1;
    authOperationId.current = operationId;
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithGoogle(payload);
      if (authOperationId.current !== operationId) return;
      await persistSignedInUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithApple = async (payload: AppleSignInPayload) => {
    const operationId = authOperationId.current + 1;
    authOperationId.current = operationId;
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithApple(payload);
      if (authOperationId.current !== operationId) return;
      await persistSignedInUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signUp = async (payload: SignUpPayload) => {
    const operationId = authOperationId.current + 1;
    authOperationId.current = operationId;
    setIsSubmitting(true);

    try {
      const nextUser = await registerWithPassword(payload);
      if (authOperationId.current !== operationId) return;
      await persistSignedInUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = async () => {
    const operationId = authOperationId.current + 1;
    authOperationId.current = operationId;
    setIsSubmitting(true);

    try {
      await import("@/services/push-notifications")
        .then((module) => module.unregisterCurrentDevicePushToken())
        .catch(() => undefined);
    } catch {
      // Push token cleanup is best effort; logout must continue.
    }

    try {
      await logoutApi();
    } catch {
      // Local session cleanup still runs if the server session is already gone.
    } finally {
      if (authOperationId.current === operationId) {
        await clearLocalSession("manual_logout");
      }
      setIsSubmitting(false);
    }
  };

  const deleteAccount = async () => {
    const operationId = authOperationId.current + 1;
    authOperationId.current = operationId;
    setIsSubmitting(true);

    try {
      await import("@/services/push-notifications")
        .then((module) => module.unregisterCurrentDevicePushToken())
        .catch(() => undefined);
    } catch {
      // Push token cleanup is best effort; the backend deletes all tokens for the account.
    }

    try {
      await deleteMyAccountApi();
      if (authOperationId.current === operationId) {
        await clearLocalSession("manual_logout");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateUser = (nextUser: AuthUser) => {
    if (!getAccessToken()) {
      return;
    }

    setUser(nextUser);
    void writeStoredUser(nextUser);
  };

  // Nothing below the provider mounts until user + tokens are restored, so no
  // screen can run a redirect against a half-hydrated session.
  if (!isReady) {
    return <AuthHydrationSplash />;
  }

  return (
    <AuthContext.Provider
      value={{
        authReady: isReady,
        isAuthenticated,
        isSubmitting,
        user,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signUp,
        signOut,
        deleteAccount,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
