#!/usr/bin/env bash
set -euo pipefail

MODELS_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/models"
mkdir -p "$MODELS_DIR"

FACE_URL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
HAND_URL="https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"

download() {
  local url="$1"
  local dest="$2"
  if [ -f "$dest" ]; then
    echo "  Already exists: $(basename "$dest")"
    return
  fi
  echo "  Downloading: $(basename "$dest")"
  curl -fsSL -o "$dest" "$url"
}

echo "Downloading MediaPipe models..."
download "$FACE_URL" "$MODELS_DIR/face_landmarker.task"
download "$HAND_URL" "$MODELS_DIR/hand_landmarker.task"
echo "Done."
