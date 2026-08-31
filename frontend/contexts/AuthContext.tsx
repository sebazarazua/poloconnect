import { PropsWithChildren, createContext, useContext, useEffect, useState } from "react";
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
import { clearAuthTokens, getAccessToken, hydrateAuthTokens } from "@/services/api/client";
import { getAuthStorageItem, setAuthStorageItem } from "@/services/auth-storage";
import { Platform } from "react-native";

const AUTH_USER_STORAGE_KEY = "pc_auth_user";

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
  isAuthenticated: boolean;
  isSubmitting: boolean;
  user: AuthUser | null;
  signIn: (payload: SignInPayload) => Promise<void>;
  signInWithGoogle: (payload: GoogleSignInPayload) => Promise<void>;
  signInWithApple: (payload: AppleSignInPayload) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (nextUser: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasSessionToken, setHasSessionToken] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAuthenticated = user !== null && hasSessionToken;

  const persistSignedInUser = async (nextUser: AuthUser) => {
    if (!getAccessToken()) {
      await Promise.all([clearAuthTokens(), writeStoredUser(null)]);
      setUser(null);
      setHasSessionToken(false);
      throw new Error("El login no dejó una sesión con access token.");
    }

    setUser(nextUser);
    setHasSessionToken(true);
    await writeStoredUser(nextUser);
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await hydrateAuthTokens();

      const storedUser = await readStoredUser();
      const hasToken = Boolean(getAccessToken());
      const isProductionWeb = Platform.OS === "web" && !(typeof __DEV__ !== "undefined" && __DEV__);
      const isDemoUser = storedUser?.id.startsWith("demo-seed-") ?? false;

      if (isProductionWeb && isDemoUser) {
        await Promise.all([clearAuthTokens(), writeStoredUser(null)]);
        return null;
      }

      if (storedUser && !hasToken) {
        await Promise.all([clearAuthTokens(), writeStoredUser(null)]);
        return null;
      }

      if (!storedUser && hasToken) {
        try {
          const currentUser = await getCurrentUser();
          await writeStoredUser(currentUser);
          return currentUser;
        } catch {
          await clearAuthTokens();
          return null;
        }
      }

      return storedUser;
    })()
      .then((nextUser) => {
        if (cancelled) return;
        setUser(nextUser);
        setHasSessionToken(Boolean(nextUser && getAccessToken()));
      })
      .finally(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (payload: SignInPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithPassword(payload);
      await persistSignedInUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithGoogle = async (payload: GoogleSignInPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithGoogle(payload);
      await persistSignedInUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithApple = async (payload: AppleSignInPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithApple(payload);
      await persistSignedInUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signUp = async (payload: SignUpPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await registerWithPassword(payload);
      await persistSignedInUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = async () => {
    setIsSubmitting(true);

    try {
      await logoutApi();
    } catch {
      // Local session cleanup still runs if the server session is already gone.
    } finally {
      await clearAuthTokens();
      await writeStoredUser(null);
      setUser(null);
      setHasSessionToken(false);
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

  if (!isReady) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isSubmitting,
        user,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signUp,
        signOut,
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
