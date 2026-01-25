import { useEffect, useRef, useState } from "react";
import { useThemeStore } from "@/stores/themeStore";

// Vertex shader - simple pass-through for full-screen quad
const vertexShaderSource = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Fragment shader - all the wavy blob magic happens here on the GPU
const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_isDark;

// Blob data: vec4(x, y, radius, speed) and vec4(r, g, b, a) for color
// We have 5 blobs

// Calculate wavy distance from a point to blob center
float wavyDistance(vec2 point, vec2 center, float radius, float time, float speed, float phase) {
  vec2 diff = point - center;
  float angle = atan(diff.y, diff.x);
  float dist = length(diff);

  // Wave distortions on the radius
  float waveAmplitude = radius * 0.3;
  float waveOffset = time * speed * 2.0;
  float wave1 = sin(angle * 3.0 + waveOffset) * waveAmplitude * 0.5;
  float wave2 = sin(angle * 5.0 + waveOffset * 1.3) * waveAmplitude * 0.3;
  float wave3 = cos(angle * 2.0 + waveOffset * 0.7) * waveAmplitude * 0.4;

  float wavyRadius = radius + wave1 + wave2 + wave3;

  return dist / wavyRadius;
}

// Smooth blob contribution with radial gradient
vec4 blobColor(vec2 uv, vec2 center, float radius, float time, float speed, float phase, vec4 color) {
  // Add motion to center
  float offsetX = sin(time * speed + phase) * 50.0;
  float offsetY = cos(time * speed * 0.8 + phase) * 30.0;
  vec2 animCenter = center + vec2(offsetX, offsetY);

  float d = wavyDistance(uv, animCenter, radius, time, speed, phase);

  // Radial gradient falloff
  float alpha = 1.0 - smoothstep(0.0, 1.3, d);
  alpha *= color.a;

  // Inner gradient (stronger at center)
  float innerGrad = 1.0 - smoothstep(0.0, 0.6, d);
  alpha = mix(alpha * 0.5, alpha, innerGrad);

  return vec4(color.rgb, alpha);
}

// Wave function for bottom waves
float waveY(float x, float yBase, float amplitude, float frequency, float offset) {
  return yBase +
    sin(x * frequency + offset) * amplitude +
    sin(x * frequency * 0.5 + offset * 1.5) * amplitude * 0.5;
}

void main() {
  // Flip Y to match canvas 2D coordinate system (0 at top)
  vec2 flippedUV = vec2(v_uv.x, 1.0 - v_uv.y);
  vec2 pixel = flippedUV * u_resolution;

  // Light mode colors (r, g, b normalized, then alpha)
  vec4 lightRust = vec4(180.0/255.0, 83.0/255.0, 40.0/255.0, 0.35);
  vec4 lightCopper = vec4(184.0/255.0, 115.0/255.0, 51.0/255.0, 0.30);
  vec4 lightBronze = vec4(205.0/255.0, 127.0/255.0, 50.0/255.0, 0.25);
  vec4 lightAmber = vec4(255.0/255.0, 191.0/255.0, 0.0/255.0, 0.20);
  vec4 lightDark = vec4(139.0/255.0, 69.0/255.0, 19.0/255.0, 0.25);

  // Dark mode colors
  vec4 darkRust = vec4(255.0/255.0, 80.0/255.0, 30.0/255.0, 0.85);
  vec4 darkCopper = vec4(255.0/255.0, 110.0/255.0, 50.0/255.0, 0.75);
  vec4 darkBronze = vec4(255.0/255.0, 140.0/255.0, 70.0/255.0, 0.70);
  vec4 darkAmber = vec4(255.0/255.0, 160.0/255.0, 90.0/255.0, 0.65);
  vec4 darkDark = vec4(200.0/255.0, 70.0/255.0, 30.0/255.0, 0.70);

  // Select colors based on theme
  vec4 rust = mix(lightRust, darkRust, u_isDark);
  vec4 copper = mix(lightCopper, darkCopper, u_isDark);
  vec4 bronze = mix(lightBronze, darkBronze, u_isDark);
  vec4 amber = mix(lightAmber, darkAmber, u_isDark);
  vec4 darkC = mix(lightDark, darkDark, u_isDark);

  // Blob positions (as fractions of resolution)
  vec2 pos1 = vec2(0.2, 0.3) * u_resolution;
  vec2 pos2 = vec2(0.8, 0.2) * u_resolution;
  vec2 pos3 = vec2(0.5, 0.7) * u_resolution;
  vec2 pos4 = vec2(0.1, 0.8) * u_resolution;
  vec2 pos5 = vec2(0.9, 0.6) * u_resolution;

  // Blob radii
  float r1 = 300.0, r2 = 250.0, r3 = 350.0, r4 = 200.0, r5 = 280.0;

  // Blob speeds and phases
  float s1 = 0.0008, s2 = 0.001, s3 = 0.0006, s4 = 0.0012, s5 = 0.0007;
  float p1 = 0.0, p2 = 1.047, p3 = 1.571, p4 = 3.142, p5 = 4.712;

  // Calculate blob contributions
  vec4 b1 = blobColor(pixel, pos1, r1, u_time, s1, p1, rust);
  vec4 b2 = blobColor(pixel, pos2, r2, u_time, s2, p2, copper);
  vec4 b3 = blobColor(pixel, pos3, r3, u_time, s3, p3, bronze);
  vec4 b4 = blobColor(pixel, pos4, r4, u_time, s4, p4, amber);
  vec4 b5 = blobColor(pixel, pos5, r5, u_time, s5, p5, darkC);

  // Blend blobs together (additive-ish blending)
  vec4 result = vec4(0.0);

  // Alpha compositing for each blob
  result.rgb = mix(result.rgb, b1.rgb, b1.a);
  result.a = result.a + b1.a * (1.0 - result.a);

  result.rgb = mix(result.rgb, b2.rgb, b2.a * (1.0 - result.a * 0.5));
  result.a = result.a + b2.a * (1.0 - result.a);

  result.rgb = mix(result.rgb, b3.rgb, b3.a * (1.0 - result.a * 0.5));
  result.a = result.a + b3.a * (1.0 - result.a);

  result.rgb = mix(result.rgb, b4.rgb, b4.a * (1.0 - result.a * 0.5));
  result.a = result.a + b4.a * (1.0 - result.a);

  result.rgb = mix(result.rgb, b5.rgb, b5.a * (1.0 - result.a * 0.5));
  result.a = result.a + b5.a * (1.0 - result.a);

  // Wave colors
  vec3 waveColor1 = mix(vec3(180.0, 83.0, 40.0)/255.0, vec3(255.0, 80.0, 30.0)/255.0, u_isDark);
  vec3 waveColor2 = mix(vec3(184.0, 115.0, 51.0)/255.0, vec3(255.0, 110.0, 50.0)/255.0, u_isDark);
  vec3 waveColor3 = mix(vec3(205.0, 127.0, 50.0)/255.0, vec3(255.0, 140.0, 70.0)/255.0, u_isDark);

  float waveAlpha1 = mix(0.25, 0.6, u_isDark);
  float waveAlpha2 = mix(0.20, 0.5, u_isDark);
  float waveAlpha3 = mix(0.15, 0.4, u_isDark);

  // Draw waves (bottom of screen)
  float y = pixel.y;
  float x = pixel.x;

  // Wave 1 (furthest back)
  float wave1Y = waveY(x, u_resolution.y * 0.75, 40.0, 0.008, u_time * 0.0008);
  if (y > wave1Y) {
    result.rgb = mix(result.rgb, waveColor1, waveAlpha1);
    result.a = max(result.a, waveAlpha1);
  }

  // Wave 2
  float wave2Y = waveY(x, u_resolution.y * 0.82, 35.0, 0.01, u_time * 0.001 + 3.142);
  if (y > wave2Y) {
    result.rgb = mix(result.rgb, waveColor2, waveAlpha2);
    result.a = max(result.a, waveAlpha2);
  }

  // Wave 3 (front)
  float wave3Y = waveY(x, u_resolution.y * 0.9, 30.0, 0.012, u_time * 0.0012 + 1.571);
  if (y > wave3Y) {
    result.rgb = mix(result.rgb, waveColor3, waveAlpha3);
    result.a = max(result.a, waveAlpha3);
  }

  fragColor = result;
}
`;

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * GPU-accelerated wavy background with rusty copper gradient blobs.
 * Uses WebGL shaders for near-zero CPU usage.
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

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true
    });
    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    // Set up full-screen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const isDarkLocation = gl.getUniformLocation(program, "u_isDark");

    let animationId: number;
    let startTime = performance.now();

    // Resize canvas to match window
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // Animation loop
    const animate = () => {
      const time = performance.now() - startTime;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Set up vertex attribute
      gl.enableVertexAttribArray(positionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Set uniforms
      gl.uniform1f(timeLocation, time);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(isDarkLocation, isDark ? 1.0 : 0.0);

      // Enable blending for transparency
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
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
