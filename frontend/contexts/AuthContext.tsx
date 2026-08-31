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
import { logout as logoutApi } from "@/services/api/auth";
import { clearAuthTokens, hydrateAuthTokens } from "@/services/api/client";
import { getAuthStorageItem, setAuthStorageItem } from "@/services/auth-storage";

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
  signOut: () => void;
  updateUser: (nextUser: AuthUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([hydrateAuthTokens(), readStoredUser()])
      .then(([, storedUser]) => {
        if (cancelled) return;
        setUser(storedUser);
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
      setUser(nextUser);
      await writeStoredUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithGoogle = async (payload: GoogleSignInPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithGoogle(payload);
      setUser(nextUser);
      await writeStoredUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithApple = async (payload: AppleSignInPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithApple(payload);
      setUser(nextUser);
      await writeStoredUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signUp = async (payload: SignUpPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await registerWithPassword(payload);
      setUser(nextUser);
      await writeStoredUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = () => {
    void logoutApi().catch(() => clearAuthTokens());
    setUser(null);
    void writeStoredUser(null);
  };

  const updateUser = (nextUser: AuthUser) => {
    setUser(nextUser);
    void writeStoredUser(nextUser);
  };

  if (!isReady) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: user !== null,
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
