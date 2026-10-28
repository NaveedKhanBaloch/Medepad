"use client";

// Light / dark theme for this device (saved in the browser).
import { useSyncExternalStore } from "react";

const THEME_KEY = "medepad-admin.theme";
export type Theme = "light" | "dark";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {}
  emit();
}

const getTheme = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");

export const useTheme = () => useSyncExternalStore(subscribe, getTheme, () => "light" as const);

/** Runs before the first paint (in layout.tsx) so dark mode does not flash white. */
export const themeScript = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;
