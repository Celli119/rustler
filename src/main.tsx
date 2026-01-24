import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { OverlayButton } from "./components/OverlayButton"

// Check if this is the overlay window
const isOverlay = new URLSearchParams(window.location.search).get("overlay") === "true"

// For overlay window, force transparent background
if (isOverlay) {
  document.documentElement.style.background = "transparent"
  document.body.style.background = "transparent"
  document.documentElement.classList.add("overlay-window")
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isOverlay ? <OverlayButton /> : <App />}
  </StrictMode>
)
