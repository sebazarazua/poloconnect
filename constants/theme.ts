import { PropsWithChildren, createContext, createElement, useContext, useMemo, useState } from "react";

export const lightColors = {
  background: "#ffffff",
  surface: "#f6faff",
  surfaceStrong: "#edf6ff",
  border: "#d9e9f7",
  primary: "#0a66c2",
  primaryDark: "#064f99",
  primarySoft: "#d8ecff",
  text: "#102235",
  muted: "#6f8499",
  success: "#147d6f",
  danger: "#df4b4b",
  dangerSoft: "#fff1ef",
  warning: "#b7791f"
};

export const darkColors = {
  background: "#071221",
  surface: "#0d1b2d",
  surfaceStrong: "#142740",
  border: "#213b59",
  primary: "#5aa7ff",
  primaryDark: "#8dc2ff",
  primarySoft: "#12395e",
  text: "#f4f8ff",
  muted: "#9bb0c7",
  success: "#43c6aa",
  danger: "#ff7b7b",
  dangerSoft: "#3a1820",
  warning: "#f1b85b"
};

export type ThemeMode = "light" | "dark";
export type AppColors = typeof lightColors;

export const colors = lightColors;

type ThemeContextValue = {
  mode: ThemeMode;
  colors: AppColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>("light");

  const value = useMemo<ThemeContextValue>(() => {
    const currentColors = mode === "dark" ? darkColors : lightColors;

    return {
      mode,
      colors: currentColors,
      setMode,
      toggleTheme: () => setMode((currentMode) => (currentMode === "dark" ? "light" : "dark"))
    };
  }, [mode]);

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}

export function useThemeColors() {
  return useTheme().colors;
}

export const radius = {
  card: 18,
  pill: 999
};
