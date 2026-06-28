import { PropsWithChildren, createContext, useContext, useState } from "react";
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

const AUTH_USER_STORAGE_KEY = "pc_auth_user";

function readStoredUser() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(AUTH_USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;

  try {
    if (user) {
      window.sessionStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.sessionStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  } catch {
    // Ignore session storage errors.
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
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signIn = async (payload: SignInPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithPassword(payload);
      setUser(nextUser);
      writeStoredUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithGoogle = async (payload: GoogleSignInPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithGoogle(payload);
      setUser(nextUser);
      writeStoredUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithApple = async (payload: AppleSignInPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithApple(payload);
      setUser(nextUser);
      writeStoredUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signUp = async (payload: SignUpPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await registerWithPassword(payload);
      setUser(nextUser);
      writeStoredUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = () => {
    void logoutApi();
    setUser(null);
    writeStoredUser(null);
  };

  const updateUser = (nextUser: AuthUser) => {
    setUser(nextUser);
    writeStoredUser(nextUser);
  };

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