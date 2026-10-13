#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/temp/app"
mkdir -p "$ROOT/temp"
vega project generate --template helloWorld --name EightAgain --packageId io.github.blucca.eightagain --outputDir "$APP"
cp "$ROOT/src/"*.ts* "$APP/src/"
cp -r "$ROOT/assets" "$APP/assets"
cp "$ROOT/manifest.toml" "$APP/manifest.toml"
cd "$APP"
vega project install @amazon-devices/react-native-w3cmedia
npm install --no-audit --no-fund
npm run build:app
