import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";
import type { Theme } from "@/stores/themeStore";

function resolveIsDark(theme: Theme): boolean {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return theme === "dark";
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

// Apply theme synchronously before first render to prevent flash
function initThemeSync() {
  try {
    const raw = localStorage.getItem("theme-storage");
    if (raw) {
      const parsed = JSON.parse(raw);
      const theme: Theme = parsed?.state?.theme ?? "dark";
      applyTheme(resolveIsDark(theme));
    } else {
      applyTheme(true); // default is dark
    }
  } catch {
    applyTheme(true);
  }
}

initThemeSync();

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    applyTheme(resolveIsDark(theme));

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return <>{children}</>;
}
