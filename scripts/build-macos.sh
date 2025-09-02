#!/usr/bin/env bash

set -euo pipefail

log() { printf "\033[1;32m[INFO]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[ERROR]\033[0m %s\n" "$*"; }

# Change to repo root (script lives in scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Ensure we're on macOS
if [[ "$(uname -s)" != "Darwin" ]]; then
  err "This script is intended for macOS only."
  exit 1
fi

log "Repository root: $REPO_ROOT"

# Suggest Xcode Command Line Tools if missing (cannot auto-install non-interactively)
if ! xcode-select -p >/dev/null 2>&1; then
  warn "Xcode Command Line Tools not found. If any native deps are used, builds may fail."
  warn "Install them with: xcode-select --install"
fi

# Install Homebrew if needed (non-interactive)
ensure_homebrew() {
  if command -v brew >/dev/null 2>&1; then
    return
  fi

  log "Homebrew not found. Installing Homebrew (NONINTERACTIVE=1)..."
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Activate brew in current shell
  if [[ -x "/opt/homebrew/bin/brew" ]]; then
    eval "$('/opt/homebrew/bin/brew' shellenv)"
  elif [[ -x "/usr/local/bin/brew" ]]; then
    eval "$('/usr/local/bin/brew' shellenv)"
  fi
}

# Ensure brew is available in PATH (covers fresh installs and existing ones)
activate_homebrew_shellenv() {
  if command -v brew >/dev/null 2>&1; then
    # If brew is already in PATH, still try to export shellenv for correct prefixes
    if brew --prefix >/dev/null 2>&1; then
      eval "$(brew shellenv)"
    fi
  else
    if [[ -x "/opt/homebrew/bin/brew" ]]; then
      eval "$('/opt/homebrew/bin/brew' shellenv)"
    elif [[ -x "/usr/local/bin/brew" ]]; then
      eval "$('/usr/local/bin/brew' shellenv)"
    fi
  fi
}

ensure_node() {
  local required_major=18
  local have_major=""
  if command -v node >/dev/null 2>&1; then
    have_major="$(node -v | sed -E 's/v([0-9]+).*/\1/')"
  fi

  if [[ -z "$have_major" || "$have_major" -lt "$required_major" ]]; then
    log "Installing Node.js (via Homebrew) because current is missing or < v$required_major..."
    brew install node@20 || brew install node || true
    # Link preferred version
    if brew list node@20 >/dev/null 2>&1; then
      brew link --overwrite --force node@20 || true
    fi
  else
    log "Detected Node.js v$have_major (>= $required_major)."
  fi
}

ensure_homebrew
activate_homebrew_shellenv
ensure_node

# Display versions
log "Using Node: $(command -v node || echo 'not found')"
log "Node version: $(node -v 2>/dev/null || echo 'not found')"
log "Using npm: $(command -v npm || echo 'not found')"
log "npm version: $(npm -v 2>/dev/null || echo 'not found')"

# Install dependencies
if [[ -f "$REPO_ROOT/package-lock.json" ]]; then
  log "Installing dependencies with npm ci..."
  if ! npm ci; then
    warn "npm ci failed, falling back to npm install..."
    npm install
  fi
else
  log "No package-lock.json found, running npm install..."
  npm install
fi

# Build web and electron preload/main bundles
log "Running npm run build..."
npm run build

# Build distributables (DMG)
log "Running npm run dist (electron-builder)..."
npm run dist

# Open the latest DMG from release directory
DMG_PATH=""
if compgen -G "$REPO_ROOT/release/*.dmg" > /dev/null; then
  DMG_PATH="$(ls -t "$REPO_ROOT"/release/*.dmg | head -n 1)"
fi

if [[ -n "$DMG_PATH" && -f "$DMG_PATH" ]]; then
  log "Opening DMG: $DMG_PATH"
  open "$DMG_PATH"
  log "Build complete. The DMG should now be open in Finder."
else
  warn "No DMG found in release/. Build may have failed or used a different output path."
  warn "Check logs above and the contents of: $REPO_ROOT/release"
  exit 1
fi


