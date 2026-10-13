#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
export HOME="$ROOT/temp/home" TMPDIR="$ROOT/temp/tmp"
export NONINTERACTIVE=true VEGA_SDK_VERSION=0.24.12112 SKIP_VVD_INSTALL=false DISPLAY=:99
OUT="$ROOT/temp/evidence"
mkdir -p "$HOME" "$TMPDIR" "$OUT"
exec > >(tee "$OUT/runtime.log") 2>&1
cleanup() {
  status=$?
  if [ -n "${KEPLER_SDK_PATH:-}" ] && [ -d "$KEPLER_SDK_PATH/logs" ]; then
    cp -r "$KEPLER_SDK_PATH/logs" "$OUT/sdk-logs"
  fi
  jobs -pr | xargs -r kill || true
  exit "$status"
}
trap cleanup EXIT

curl -fsSL --max-time 90 https://sdk-installer.vega.labcollab.net/get_vvm.sh -o "$TMPDIR/get_vvm.sh"
bash "$TMPDIR/get_vvm.sh"
source "$HOME/vega/env"
vega --version
bash "$ROOT/scripts/build.sh"
cp "$ROOT/temp/app/package.json" "$ROOT/temp/app/package-lock.json" "$OUT/"
APP="$(find "$ROOT/temp/app/build" -path '*x86_64-release*' -name '*.vpkg' -print -quit)"
test -n "$APP"
cp "$APP" "$OUT/EightAgain-x86_64.vpkg"

Xvfb "$DISPLAY" -screen 0 1600x1000x24 -ac > "$OUT/xvfb.log" 2>&1 &
sleep 2
openbox > "$OUT/openbox.log" 2>&1 &
sleep 2
vega virtual-device start --no-gl-accel --display-res=1280,720 --timeout 300 > "$OUT/device.log" 2>&1
xdotool key --clearmodifiers Return
sleep 60
timeout 180 vega exec vda -s emulator-5554 wait-for-device
ready=false
for attempt in {1..12}; do
  if vega device running-apps -d VirtualDevice > "$OUT/running-apps.txt" 2>&1; then ready=true; break; fi
  sleep 5
done
test "$ready" = true
vega device install-app -p "$APP" -d VirtualDevice
sleep 5
timeout 90 vega exec vda -s emulator-5554 wait-for-device
PACKAGE=io.github.blucca.eightagain
vega exec vda shell loggingctl config --set-level "$PACKAGE" info
vega exec vda shell loggingctl log -v "$PACKAGE" -f > "$OUT/native.log" 2>&1 &
LOGGER=$!
vega device launch-app --appName "$PACKAGE.main" -d VirtualDevice
sleep 7
xdotool windowfocus --sync "$(xdotool getactivewindow)"
shot() { ffmpeg -hide_banner -loglevel error -y -f x11grab -video_size 1600x1000 -i "$DISPLAY" -frames:v 1 -update 1 "$OUT/$1.png"; }
shot ready
ffmpeg -hide_banner -loglevel error -y -f x11grab -video_size 1600x1000 -framerate 15 -i "$DISPLAY" -t 50 -c:v libx264 -preset ultrafast -crf 25 -pix_fmt yuv420p "$OUT/native-practice.mp4" > "$OUT/recording.log" 2>&1 &
RECORDER=$!
xdotool key Return
sleep 3
shot slow-playing
xdotool key Return
sleep 2
shot paused
xdotool key Down Return
sleep 3
shot replay
xdotool key Down Return
sleep 5
shot normal-speed
xdotool key Up Return
sleep 5
xdotool key Down Down Return
sleep 5
shot next-section
xdotool key Right Return
sleep 5
shot third-section
wait "$RECORDER"
kill "$LOGGER" 2>/dev/null || true
vega exec vda shell loggingctl log -v "$PACKAGE" -S today > "$OUT/native-all.log" 2>&1
shot final
vega virtual-device stop
printf 'Native application run and remote recording completed.\n'
