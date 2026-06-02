import { PropsWithChildren, createContext, useContext, useState } from "react";
import {
  authenticateWithPassword,
  registerWithPassword,
  type AuthUser,
  type SignInPayload,
  type SignUpPayload
} from "@/services/auth";

type AuthContextValue = {
  isAuthenticated: boolean;
  isSubmitting: boolean;
  user: AuthUser | null;
  signIn: (payload: SignInPayload) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signIn = async (payload: SignInPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await authenticateWithPassword(payload);
      setUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signUp = async (payload: SignUpPayload) => {
    setIsSubmitting(true);

    try {
      const nextUser = await registerWithPassword(payload);
      setUser(nextUser);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: user !== null,
        isSubmitting,
        user,
        signIn,
        signUp,
        signOut
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