#!/usr/bin/env bash
#
# capture-demo.sh — Capture animated GIF demo of Rustler using a virtual display
#
# Records a video of the app (capturing CSS animations), cycles through tabs,
# and converts to an optimized GIF.
#
# Prerequisites: Xvfb, xdotool, ffmpeg, ImageMagick (convert)
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="$PROJECT_DIR/assets"
OUTPUT_GIF="$ASSETS_DIR/demo.gif"
RAW_VIDEO="/tmp/rustler-demo-raw.mp4"
BINARY="$PROJECT_DIR/src-tauri/target/release/rustler"

# Virtual display settings
DISPLAY_NUM=":99"
SCREEN_W=900
SCREEN_H=700
SCREEN_DEPTH=24

# Timing
TAB_HOLD=3          # seconds to hold each tab (shows animated background)
STARTUP_WAIT=5      # seconds to let the app fully render

# GIF settings
GIF_FPS=4           # frames per second in output GIF
GIF_WIDTH=600       # output width (height auto-scaled)

# Tab order for the demo tour
TAB_NAMES=("History" "Recording" "Settings" "Models")

# ---------------------------------------------------------------------------
die()  { echo "ERROR: $*" >&2; exit 1; }
info() { echo ":: $*"; }

cleanup() {
  info "Cleaning up..."
  [[ -n "${FFMPEG_PID:-}" ]] && kill "$FFMPEG_PID" 2>/dev/null && wait "$FFMPEG_PID" 2>/dev/null || true
  [[ -n "${APP_PID:-}" ]] && kill "$APP_PID" 2>/dev/null || true
  [[ -n "${XVFB_PID:-}" ]] && kill "$XVFB_PID" 2>/dev/null || true
  rm -f "$RAW_VIDEO" /tmp/rustler-palette.png
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Check dependencies
# ---------------------------------------------------------------------------
for cmd in Xvfb xdotool ffmpeg; do
  command -v "$cmd" &>/dev/null || die "Missing: $cmd"
done
[[ -x "$BINARY" ]] || die "Binary not found: $BINARY (run 'bun run tauri build' first)"

# ---------------------------------------------------------------------------
# Start virtual display
# ---------------------------------------------------------------------------
info "Starting Xvfb on $DISPLAY_NUM (${SCREEN_W}x${SCREEN_H})"
Xvfb "$DISPLAY_NUM" -screen 0 "${SCREEN_W}x${SCREEN_H}x${SCREEN_DEPTH}" -ac +extension GLX &
XVFB_PID=$!
sleep 1

export DISPLAY="$DISPLAY_NUM"
export GDK_BACKEND=x11
export WEBKIT_DISABLE_DMABUF_RENDERER=1

# ---------------------------------------------------------------------------
# Launch the app
# ---------------------------------------------------------------------------
info "Launching Rustler..."
"$BINARY" &
APP_PID=$!
sleep "$STARTUP_WAIT"

# Find the window
info "Looking for Rustler window..."
WIN_ID=""
for _ in $(seq 1 15); do
  WIN_ID=$(xdotool search --name "Rustler" 2>/dev/null | head -1) || true
  [[ -n "$WIN_ID" ]] && break
  sleep 1
done
[[ -n "$WIN_ID" ]] || die "Could not find Rustler window"
info "Found window: $WIN_ID"

# Position and resize (no WM needed — these work on bare X)
xdotool windowactivate "$WIN_ID" 2>/dev/null || true
xdotool windowfocus "$WIN_ID" 2>/dev/null || true
xdotool windowmove "$WIN_ID" 0 0 2>/dev/null || true
xdotool windowsize "$WIN_ID" "$SCREEN_W" "$SCREEN_H" 2>/dev/null || true
sleep 1

eval "$(xdotool getwindowgeometry --shell "$WIN_ID")"
info "Window at ${X},${Y} size ${WIDTH}x${HEIGHT}"

# ---------------------------------------------------------------------------
# Tab click positions
# Header ~56px, tab bar center ~76px from window top
# Tabs: History(~55px), Recording(~155px), Settings(~260px), Models(~355px)
# ---------------------------------------------------------------------------
TAB_Y=$((Y + 76))
TAB_XS=(
  $((X + 55))    # History
  $((X + 155))   # Recording
  $((X + 260))   # Settings
  $((X + 355))   # Models
)

# ---------------------------------------------------------------------------
# Start video recording (captures CSS animations!)
# ---------------------------------------------------------------------------
info "Starting video recording..."
ffmpeg -y \
  -f x11grab \
  -video_size "${WIDTH}x${HEIGHT}" \
  -framerate 24 \
  -i "${DISPLAY}+${X},${Y}" \
  -c:v libx264 -preset ultrafast -crf 18 -pix_fmt yuv420p \
  "$RAW_VIDEO" &>/dev/null &
FFMPEG_PID=$!
sleep 1

# ---------------------------------------------------------------------------
# Cycle through tabs
# ---------------------------------------------------------------------------
info "Recording tab tour..."

# Hold on History tab first (it's the default)
info "  Showing: History"
sleep "$TAB_HOLD"

# Click through remaining tabs
for i in 1 2 3; do
  tab_name="${TAB_NAMES[$i]}"
  tab_x="${TAB_XS[$i]}"
  info "  Switching to: $tab_name"
  xdotool mousemove "$tab_x" "$TAB_Y"
  sleep 0.2
  xdotool click 1
  sleep "$TAB_HOLD"
done

# Return to History for a clean loop
info "  Returning to: History"
xdotool mousemove "${TAB_XS[0]}" "$TAB_Y"
sleep 0.2
xdotool click 1
sleep 2

# ---------------------------------------------------------------------------
# Stop recording
# ---------------------------------------------------------------------------
info "Stopping recording..."
kill -INT "$FFMPEG_PID" 2>/dev/null || true
wait "$FFMPEG_PID" 2>/dev/null || true
unset FFMPEG_PID
sleep 1

# ---------------------------------------------------------------------------
# Convert video to optimized GIF (two-pass for quality)
# ---------------------------------------------------------------------------
info "Converting to optimized GIF..."
mkdir -p "$ASSETS_DIR"

# Pass 1: generate optimal palette
ffmpeg -y -i "$RAW_VIDEO" \
  -vf "fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos,palettegen=stats_mode=diff:max_colors=128" \
  /tmp/rustler-palette.png 2>/dev/null

# Pass 2: apply palette for high-quality dithering
ffmpeg -y -i "$RAW_VIDEO" -i /tmp/rustler-palette.png \
  -lavfi "fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3" \
  -loop 0 \
  "$OUTPUT_GIF" 2>/dev/null

rm -f /tmp/rustler-palette.png "$RAW_VIDEO"

SIZE=$(du -h "$OUTPUT_GIF" | cut -f1)
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT_GIF" 2>/dev/null || echo "?")
info ""
info "Demo GIF saved: $OUTPUT_GIF ($SIZE)"
info "Use in README:  ![Rustler Demo](assets/demo.gif)"
