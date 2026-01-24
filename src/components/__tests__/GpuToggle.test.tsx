import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GpuToggle } from "../GpuToggle";
import { useAppStore } from "@/stores/appStore";
import { resetMocks, mockSettings } from "@/test/mocks/tauri";

const mockUpdateSettings = vi.fn();

vi.mock("@/hooks/useSettings", () => ({
  useSettings: () => ({
    settings: useAppStore.getState().settings,
    updateSettings: mockUpdateSettings,
    updateHotkey: vi.fn(),
  }),
}));

describe("GpuToggle", () => {
  beforeEach(() => {
    resetMocks();
    mockUpdateSettings.mockClear();
    useAppStore.setState({
      settings: { ...mockSettings, useGpu: false },
    });
  });

  it("renders the GPU toggle", () => {
    render(<GpuToggle />);

    expect(screen.getByText("GPU Acceleration")).toBeInTheDocument();
    expect(screen.getByText(/Use GPU for faster transcription/i)).toBeInTheDocument();
  });

  it("renders the switch component", () => {
    render(<GpuToggle />);

    const switchElement = screen.getByRole("switch");
    expect(switchElement).toBeInTheDocument();
  });

  it("switch is unchecked when useGpu is false", () => {
    render(<GpuToggle />);

    const switchElement = screen.getByRole("switch");
    expect(switchElement).toHaveAttribute("data-unchecked");
  });

  it("switch is checked when useGpu is true", () => {
    useAppStore.setState({
      settings: { ...mockSettings, useGpu: true },
    });
    render(<GpuToggle />);

    const switchElement = screen.getByRole("switch");
    expect(switchElement).toHaveAttribute("data-checked");
  });

  it("calls updateSettings when switch is toggled on", async () => {
    const user = userEvent.setup();
    render(<GpuToggle />);

    const switchElement = screen.getByRole("switch");
    await user.click(switchElement);

    expect(mockUpdateSettings).toHaveBeenCalledWith({ useGpu: true });
  });

  it("calls updateSettings when switch is toggled off", async () => {
    useAppStore.setState({
      settings: { ...mockSettings, useGpu: true },
    });
    const user = userEvent.setup();
    render(<GpuToggle />);

    const switchElement = screen.getByRole("switch");
    await user.click(switchElement);

    expect(mockUpdateSettings).toHaveBeenCalledWith({ useGpu: false });
  });

  it("has accessible label", () => {
    render(<GpuToggle />);

    const switchElement = screen.getByRole("switch");
    expect(switchElement).toBeInTheDocument();

    const label = screen.getByText("GPU Acceleration");
    expect(label).toBeInTheDocument();
  });

  it("displays CUDA requirement in description", () => {
    render(<GpuToggle />);

    expect(screen.getByText(/requires CUDA support/i)).toBeInTheDocument();
  });
});
