#!/usr/bin/env bash
# ============================================================================
# EconoPulse iOS — one-shot build script for MacInCloud
# ============================================================================
# Run this on a fresh MacInCloud Mac mini M2 (macOS Sonoma/Sequoia + Xcode).
# It clones the repo, builds the web bundle, syncs Capacitor iOS, runs
# `pod install`, and opens the Xcode workspace ready to Archive.
#
# Usage:
#   chmod +x ios-build-macincloud.sh
#   ./ios-build-macincloud.sh
# ============================================================================

set -euo pipefail

REPO_URL="https://github.com/Rinorambla/econopulse.git"
WORKDIR="$HOME/Desktop/econopulse"

echo "==> 1/7  Checking tools"
xcode-select -p >/dev/null || { echo "ERROR: Xcode not installed"; exit 1; }
echo "    Xcode: $(xcodebuild -version | head -n1)"

if ! command -v brew >/dev/null 2>&1; then
  echo "==> Installing Homebrew (first time only, ~5 min)"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # add brew to PATH for Apple Silicon
  eval "$(/opt/homebrew/bin/brew shellenv)"
fi

echo "==> 2/7  Installing Node 20 + CocoaPods (if missing)"
brew list node@20 >/dev/null 2>&1 || brew install node@20
brew list cocoapods >/dev/null 2>&1 || brew install cocoapods
# expose node@20
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
echo "    Node:  $(node --version)"
echo "    npm:   $(npm --version)"
echo "    pod:   $(pod --version)"

echo "==> 3/7  Cloning repo"
if [ -d "$WORKDIR" ]; then
  echo "    Repo already exists at $WORKDIR — pulling latest"
  cd "$WORKDIR" && git pull --rebase
else
  git clone "$REPO_URL" "$WORKDIR"
  cd "$WORKDIR"
fi

echo "==> 4/7  npm install (~2-3 min)"
npm install

echo "==> 5/7  npm run build (Next.js production build)"
npm run build

echo "==> 6/7  Capacitor sync iOS"
npx cap sync ios

echo "==> 7/7  pod install"
cd ios/App
pod install --repo-update

echo ""
echo "============================================================"
echo "  DONE — opening Xcode workspace"
echo "============================================================"
echo ""
echo "Next steps in Xcode:"
echo "  1. Signing & Capabilities: select your Team (4GDG5V64FT),"
echo "     enable 'Automatically manage signing'"
echo "  2. Top bar: select 'Any iOS Device (arm64)' as destination"
echo "  3. Product → Archive  (~3-5 min)"
echo "  4. Organizer → Distribute App → App Store Connect → Upload"
echo ""

open App.xcworkspace
