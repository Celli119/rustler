#!/usr/bin/env bash
#
# record-demo.sh — Record an animated GIF demo of Rustler cycling through tabs
#
# Prerequisites:
#   sudo apt install ffmpeg ydotool
#   sudo systemctl enable --now ydotoold
#
# Usage:
#   1. Launch Rustler and position the window where you want it
#   2. Run: ./scripts/record-demo.sh
#   3. Click on the Rustler window when prompted (to get its geometry)
#   4. The script cycles through tabs and records
#   5. Output: assets/demo.gif
#
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="$PROJECT_DIR/assets"
OUTPUT_GIF="$ASSETS_DIR/demo.gif"
RAW_VIDEO="/tmp/rustler-demo-raw.mp4"

# Timing
TAB_HOLD=3         # seconds to display each tab
INITIAL_WAIT=1     # seconds before starting tab cycling
FADE_PAUSE=0.5     # pause between tab switches

# GIF settings
GIF_FPS=12
GIF_WIDTH=720       # width in pixels (height auto-scaled)

# Tab order for the demo tour
TABS=("History" "Recording" "Settings" "Models")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
die()  { echo "ERROR: $*" >&2; exit 1; }
info() { echo ":: $*"; }

check_deps() {
  local missing=()
  for cmd in ffmpeg ydotool; do
    command -v "$cmd" &>/dev/null || missing+=("$cmd")
  done
  if (( ${#missing[@]} )); then
    die "Missing dependencies: ${missing[*]}. Install with: sudo apt install ${missing[*]}"
  fi

  # Check ydotoold is running
  if ! pidof ydotoold &>/dev/null; then
    die "ydotoold is not running. Start it with: sudo systemctl start ydotoold"
  fi
}

get_window_geometry() {
  # Use GNOME/portal-friendly approach: ask user to provide geometry
  # or try to detect via xdotool (works for XWayland windows)
  if command -v xdotool &>/dev/null; then
    info "Click on the Rustler window..."
    local wid
    wid=$(xdotool selectwindow 2>/dev/null) || true
    if [[ -n "$wid" ]]; then
      local geom
      geom=$(xdotool getwindowgeometry --shell "$wid" 2>/dev/null) || true
      if [[ -n "$geom" ]]; then
        eval "$geom"  # sets X, Y, WIDTH, HEIGHT, WINDOW
        WIN_X=$X
        WIN_Y=$Y
        WIN_W=$WIDTH
        WIN_H=$HEIGHT
        WIN_ID=$wid
        info "Window geometry: ${WIN_W}x${WIN_H}+${WIN_X}+${WIN_Y}"
        return 0
      fi
    fi
  fi

  # Fallback: ask user
  info "Could not auto-detect window. Please enter the window geometry."
  read -rp "Window X position: " WIN_X
  read -rp "Window Y position: " WIN_Y
  read -rp "Window width: " WIN_W
  read -rp "Window height: " WIN_H
  WIN_ID=""
}

# Calculate tab button positions based on window geometry
# Tabs are in a nav bar below the header (~56px header + ~40px into the tab bar)
# Tabs are horizontally distributed with ~90px width each, starting at ~24px padding
get_tab_positions() {
  local header_height=56
  local tab_bar_center_y=$((WIN_Y + header_height + 20))
  local tab_start_x=$((WIN_X + 48))   # px-6 (24px) + half button width
  local tab_spacing=100                 # approximate spacing between tab centers

  TAB_Y=$tab_bar_center_y
  TAB_X_HISTORY=$((tab_start_x))
  TAB_X_RECORDING=$((tab_start_x + tab_spacing))
  TAB_X_SETTINGS=$((tab_start_x + tab_spacing * 2))
  TAB_X_MODELS=$((tab_start_x + tab_spacing * 3))
}

click_tab() {
  local tab_name="$1"
  local x y
  case "$tab_name" in
    History)   x=$TAB_X_HISTORY ;;
    Recording) x=$TAB_X_RECORDING ;;
    Settings)  x=$TAB_X_SETTINGS ;;
    Models)    x=$TAB_X_MODELS ;;
    *) die "Unknown tab: $tab_name" ;;
  esac
  y=$TAB_Y

  info "  Clicking tab: $tab_name (${x}, ${y})"
  ydotool mousemove --absolute -x "$x" -y "$y"
  sleep 0.1
  ydotool click 0xC0   # left click
}

start_recording() {
  info "Starting screen recording..."
  # Use ffmpeg with PipeWire for GNOME Wayland
  # The user may need to grant screen sharing permission via the portal dialog
  if command -v pipewire &>/dev/null; then
    # Use GNOME's built-in screencast via D-Bus
    local screencast_path
    screencast_path="/tmp/rustler-demo-$$.webm"

    # Try GNOME Shell screencast (full screen, we'll crop later)
    gdbus call --session \
      --dest org.gnome.Shell.Screencast \
      --object-path /org/gnome/Shell/Screencast \
      --method org.gnome.Shell.Screencast.ScreencastArea \
      "$WIN_X" "$WIN_Y" "$WIN_W" "$WIN_H" \
      "$screencast_path" \
      "{'framerate': <uint32 24>, 'pipeline': <'vp8enc min_quantizer=13 max_quantizer=13 cpu-used=5 deadline=1000000 threads=%T'>}" \
      &>/dev/null && {
        RECORDING_METHOD="gnome"
        SCREENCAST_PATH="$screencast_path"
        info "Recording via GNOME Shell screencast"
        return 0
      }
  fi

  # Fallback: ffmpeg with x11grab (works if running under X11/XWayland)
  ffmpeg -y -f x11grab \
    -video_size "${WIN_W}x${WIN_H}" \
    -framerate 24 \
    -i "${DISPLAY:-:0}+${WIN_X},${WIN_Y}" \
    -c:v libx264 -preset ultrafast -crf 18 \
    "$RAW_VIDEO" &
  FFMPEG_PID=$!
  RECORDING_METHOD="ffmpeg"
  info "Recording via ffmpeg x11grab (PID: $FFMPEG_PID)"
}

stop_recording() {
  info "Stopping recording..."
  if [[ "${RECORDING_METHOD:-}" == "gnome" ]]; then
    gdbus call --session \
      --dest org.gnome.Shell.Screencast \
      --object-path /org/gnome/Shell/Screencast \
      --method org.gnome.Shell.Screencast.StopScreencast &>/dev/null || true
    RAW_VIDEO="$SCREENCAST_PATH"
  elif [[ -n "${FFMPEG_PID:-}" ]]; then
    kill -INT "$FFMPEG_PID" 2>/dev/null || true
    wait "$FFMPEG_PID" 2>/dev/null || true
  fi
  sleep 1
}

convert_to_gif() {
  info "Converting to optimized GIF..."
  mkdir -p "$ASSETS_DIR"

  # Two-pass GIF: generate palette first, then use it for high quality
  local palette="/tmp/rustler-palette.png"
  ffmpeg -y -i "$RAW_VIDEO" \
    -vf "fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos,palettegen=stats_mode=diff" \
    "$palette" 2>/dev/null

  ffmpeg -y -i "$RAW_VIDEO" -i "$palette" \
    -lavfi "fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3" \
    "$OUTPUT_GIF" 2>/dev/null

  rm -f "$palette"

  local size
  size=$(du -h "$OUTPUT_GIF" | cut -f1)
  info "GIF saved to: $OUTPUT_GIF ($size)"
}

cleanup() {
  stop_recording 2>/dev/null || true
  rm -f "$RAW_VIDEO" /tmp/rustler-palette.png
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  info "Rustler Demo Recorder"
  info "====================="
  echo

  check_deps
  get_window_geometry
  get_tab_positions

  trap cleanup EXIT

  # Start recording
  start_recording
  sleep "$INITIAL_WAIT"

  # Cycle through tabs
  for tab in "${TABS[@]}"; do
    click_tab "$tab"
    sleep "$TAB_HOLD"
    sleep "$FADE_PAUSE"
  done

  # Return to History tab for a clean loop
  click_tab "History"
  sleep 1

  # Stop and convert
  stop_recording
  convert_to_gif

  info ""
  info "Done! Add to README with:"
  info '  ![Rustler Demo](assets/demo.gif)'
}

main "$@"
