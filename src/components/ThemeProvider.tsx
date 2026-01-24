import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";

// Check if this is the overlay window
const isOverlay = new URLSearchParams(window.location.search).get("overlay") === "true";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    // Skip theme application for overlay window to preserve transparency
    if (isOverlay) return;

    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      applyTheme(theme === "dark");
    }
  }, [theme]);

  return <>{children}</>;
}
