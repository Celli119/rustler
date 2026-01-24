import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { OverlayButton } from "./components/OverlayButton"
import { ThemeProvider } from "./components/ThemeProvider"

// Check if this is the overlay window
const isOverlay = new URLSearchParams(window.location.search).get("overlay") === "true"

// For overlay window, force transparent background
if (isOverlay) {
  // Override the CSS variable that Tailwind uses for bg-background
  document.documentElement.style.setProperty("--background", "transparent")
  // Set inline styles with high priority
  document.documentElement.style.setProperty("background", "transparent", "important")
  document.documentElement.style.setProperty("background-color", "transparent", "important")
  document.body.style.setProperty("background", "transparent", "important")
  document.body.style.setProperty("background-color", "transparent", "important")
  const root = document.getElementById("root")
  if (root) {
    root.style.setProperty("background", "transparent", "important")
    root.style.setProperty("background-color", "transparent", "important")
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      {isOverlay ? <OverlayButton /> : <App />}
    </ThemeProvider>
  </StrictMode>
)
