import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PillOverlay } from "../PillOverlay";
import { useAppStore } from "@/stores/appStore";

describe("PillOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAppStore.setState({
      isRecording: false,
      isProcessing: false,
      transcription: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when state is idle", () => {
    const { container } = render(<PillOverlay />);
    expect(container.firstChild).toBeNull();
  });

  it("shows recording state when isRecording is true", () => {
    useAppStore.setState({ isRecording: true });
    render(<PillOverlay />);

    expect(screen.getByText("Recording...")).toBeInTheDocument();
    expect(screen.getByText("🎙️")).toBeInTheDocument();
  });

  it("shows processing state when isProcessing is true", () => {
    useAppStore.setState({ isProcessing: true });
    render(<PillOverlay />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();
    expect(screen.getByText("⚡")).toBeInTheDocument();
  });

  it("shows done state with transcription text", () => {
    useAppStore.setState({ transcription: "Hello world" });
    render(<PillOverlay />);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("truncates long transcription text", () => {
    const longText = "A".repeat(60);
    useAppStore.setState({ transcription: longText });
    render(<PillOverlay />);

    expect(screen.getByText("A".repeat(50) + "...")).toBeInTheDocument();
  });

  it("auto-hides after 3 seconds when transcription is shown", async () => {
    useAppStore.setState({ transcription: "Test" });
    const { container, rerender } = render(<PillOverlay />);

    expect(screen.getByText("Test")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Re-render to pick up state change
    rerender(<PillOverlay />);

    // After timeout, component should return null (idle state)
    expect(container.querySelector('[class*="fixed"]')).toBeNull();
  });

  it("has correct background color for recording state", () => {
    useAppStore.setState({ isRecording: true });
    render(<PillOverlay />);

    const pill = screen.getByText("Recording...").closest("div");
    expect(pill).toHaveClass("bg-red-500");
  });

  it("has correct background color for processing state", () => {
    useAppStore.setState({ isProcessing: true });
    render(<PillOverlay />);

    const pill = screen.getByText("Processing...").closest("div");
    expect(pill).toHaveClass("bg-blue-500");
  });

  it("has correct background color for done state", () => {
    useAppStore.setState({ transcription: "Done" });
    render(<PillOverlay />);

    const pill = screen.getByText("Done").closest("div");
    expect(pill).toHaveClass("bg-green-500");
  });

  it("animates icon in recording state", () => {
    useAppStore.setState({ isRecording: true });
    render(<PillOverlay />);

    const icon = screen.getByText("🎙️");
    expect(icon).toHaveClass("animate-pulse");
  });

  it("animates icon in processing state", () => {
    useAppStore.setState({ isProcessing: true });
    render(<PillOverlay />);

    const icon = screen.getByText("⚡");
    expect(icon).toHaveClass("animate-pulse");
  });

  it("does not animate icon in done state", () => {
    useAppStore.setState({ transcription: "Done" });
    render(<PillOverlay />);

    const icon = screen.getByText("✓");
    expect(icon).not.toHaveClass("animate-pulse");
  });

  it("is draggable", () => {
    useAppStore.setState({ isRecording: true });
    render(<PillOverlay />);

    const container = screen.getByText("Recording...").closest('[class*="fixed"]');
    expect(container).toHaveClass("cursor-move");
  });

  it("updates position on drag", () => {
    useAppStore.setState({ isRecording: true });
    render(<PillOverlay />);

    const container = screen.getByText("Recording...").closest('[class*="fixed"]');
    expect(container).toHaveStyle({ left: "20px", top: "20px" });

    // Simulate drag
    fireEvent.mouseDown(container!, { clientX: 20, clientY: 20 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(window);

    expect(container).toHaveStyle({ left: "100px", top: "100px" });
  });

  it("prioritizes recording state over processing", () => {
    useAppStore.setState({ isRecording: true, isProcessing: true });
    render(<PillOverlay />);

    expect(screen.getByText("Recording...")).toBeInTheDocument();
    expect(screen.queryByText("Processing...")).not.toBeInTheDocument();
  });

  it("prioritizes processing state over transcription", () => {
    useAppStore.setState({ isProcessing: true, transcription: "Test" });
    render(<PillOverlay />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });
});
