import React from "react";
import { render, type RenderOptions } from "@testing-library/react";

// Custom render function that includes providers if needed
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => {
  return render(ui, { ...options });
};

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };
