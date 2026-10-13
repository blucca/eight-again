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
node <<'JS'
const fs = require('node:fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const name = '@react-native-async-storage/async-storage';
const version = 'npm:@amazon-devices/react-native-async-storage__async-storage@~2.1.0';
pkg.dependencies[name] = version;
pkg.overrides = {...pkg.overrides, [name]: version};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
JS
npm install --no-audit --no-fund
npm run build:app
