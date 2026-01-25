import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "@/stores/themeStore";

/**
 * Animated wavy background with rusty copper gradient blobs.
 * Creates an organic, flowing aesthetic that complements the Rustler branding.
 */
export function WavyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useThemeStore();
  const [isDark, setIsDark] = useState(false);

  // Detect actual dark mode (handles "system" theme)
  useEffect(() => {
    const checkDark = () => {
      if (theme === "dark") {
        setIsDark(true);
      } else if (theme === "light") {
        setIsDark(false);
      } else {
        // System theme - check media query
        setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
    };
    checkDark();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", checkDark);
    return () => mediaQuery.removeEventListener("change", checkDark);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    // Resize canvas to match window
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Color palettes for light and dark modes
    const lightColors = {
      rust: "rgba(180, 83, 40, 0.35)",
      copper: "rgba(184, 115, 51, 0.3)",
      bronze: "rgba(205, 127, 50, 0.25)",
      amber: "rgba(255, 191, 0, 0.2)",
      dark: "rgba(139, 69, 19, 0.25)",
    };

    const darkColors = {
      rust: "rgba(255, 80, 30, 0.85)",
      copper: "rgba(255, 110, 50, 0.75)",
      bronze: "rgba(255, 140, 70, 0.7)",
      amber: "rgba(255, 160, 90, 0.65)",
      dark: "rgba(200, 70, 30, 0.7)",
    };

    const colors = isDark ? darkColors : lightColors;

    // Blob configuration
    const blobs = [
      { x: 0.2, y: 0.3, radius: 300, color: colors.rust, speed: 0.0008, phase: 0 },
      { x: 0.8, y: 0.2, radius: 250, color: colors.copper, speed: 0.001, phase: Math.PI / 3 },
      { x: 0.5, y: 0.7, radius: 350, color: colors.bronze, speed: 0.0006, phase: Math.PI / 2 },
      { x: 0.1, y: 0.8, radius: 200, color: colors.amber, speed: 0.0012, phase: Math.PI },
      { x: 0.9, y: 0.6, radius: 280, color: colors.dark, speed: 0.0007, phase: Math.PI * 1.5 },
    ];

    // Parse rgba color to get components
    const parseRgba = (color: string) => {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: parseFloat(match[4] || "1"),
        };
      }
      return { r: 255, g: 100, b: 50, a: 0.5 };
    };

    // Draw a wavy blob
    const drawBlob = (
      centerX: number,
      centerY: number,
      radius: number,
      color: string,
      waveOffset: number,
    ) => {
      ctx.beginPath();
      const points = 100;

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const waveAmplitude = radius * 0.3;
        const wave1 = Math.sin(angle * 3 + waveOffset) * waveAmplitude * 0.5;
        const wave2 = Math.sin(angle * 5 + waveOffset * 1.3) * waveAmplitude * 0.3;
        const wave3 = Math.cos(angle * 2 + waveOffset * 0.7) * waveAmplitude * 0.4;

        const r = radius + wave1 + wave2 + wave3;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();

      // Create gradient for blob - fade to background color, not transparent
      const { r, g, b, a } = parseRgba(color);
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius * 1.3,
      );
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
      gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${a * 0.5})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = gradient;
      ctx.fill();
    };

    // Draw flowing wave lines
    const drawWaves = (
      yBase: number,
      amplitude: number,
      frequency: number,
      color: string,
      offset: number,
    ) => {
      ctx.beginPath();
      ctx.moveTo(0, yBase);

      for (let x = 0; x <= canvas.width; x += 2) {
        const y =
          yBase +
          Math.sin(x * frequency + offset) * amplitude +
          Math.sin(x * frequency * 0.5 + offset * 1.5) * (amplitude * 0.5);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();

      // Use solid color for waves - more visible
      ctx.fillStyle = color;
      ctx.fill();
    };

    // Animation loop
    const animate = () => {
      time += 16; // ~60fps

      // Clear with slight fade for trail effect
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw gradient blobs
      blobs.forEach((blob) => {
        const offsetX = Math.sin(time * blob.speed + blob.phase) * 50;
        const offsetY = Math.cos(time * blob.speed * 0.8 + blob.phase) * 30;

        drawBlob(
          blob.x * canvas.width + offsetX,
          blob.y * canvas.height + offsetY,
          blob.radius,
          blob.color,
          time * blob.speed * 2,
        );
      });

      // Draw layered waves at the bottom - theme aware
      const waveColors = isDark
        ? ["rgba(255, 80, 30, 0.6)", "rgba(255, 110, 50, 0.5)", "rgba(255, 140, 70, 0.4)"]
        : ["rgba(180, 83, 40, 0.25)", "rgba(184, 115, 51, 0.2)", "rgba(205, 127, 50, 0.15)"];

      drawWaves(canvas.height * 0.75, 40, 0.008, waveColors[0], time * 0.0008);
      drawWaves(canvas.height * 0.82, 35, 0.01, waveColors[1], time * 0.001 + Math.PI);
      drawWaves(canvas.height * 0.9, 30, 0.012, waveColors[2], time * 0.0012 + Math.PI / 2);

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 1 }}
    />
  );
}
