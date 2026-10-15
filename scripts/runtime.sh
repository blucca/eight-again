#!/usr/bin/env bash
set -euo pipefail
ROOT="$PWD"
export HOME="$ROOT/temp/home" TMPDIR="$ROOT/temp/tmp"
export NONINTERACTIVE=true VEGA_SDK_VERSION=0.24.12112 SKIP_VVD_INSTALL=false DISPLAY=:99
export LIBGL_ALWAYS_SOFTWARE=1
OUT="$ROOT/temp/evidence"
mkdir -p "$HOME" "$TMPDIR" "$OUT" "$ROOT/temp/pulse"
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
find "$ROOT/temp/app/build" -type f -name '*.vpkg' -exec cp {} "$OUT/" \;

Xvfb "$DISPLAY" -screen 0 1600x1000x24 -ac > "$OUT/xvfb.log" 2>&1 &
sleep 2
openbox > "$OUT/openbox.log" 2>&1 &
sleep 2
glxinfo -B > "$OUT/host-gl.txt" 2>&1
export PULSE_SERVER="unix:$ROOT/temp/pulse/native" PULSE_SINK=eightagain
export SDL_AUDIODRIVER=pulseaudio QEMU_AUDIO_DRV=pa
pulseaudio -n --daemonize=yes --exit-idle-time=-1 --use-pid-file=no \
  --load="module-native-protocol-unix socket=$ROOT/temp/pulse/native auth-anonymous=1" \
  --load="module-null-sink sink_name=eightagain" --log-target="file:$OUT/pulse.log"
pactl info > "$OUT/pulse-info.txt"
pactl set-default-sink eightagain
vega virtual-device start --display-res=1280,720 --timeout 300 > "$OUT/device.log" 2>&1
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
sleep 1
vega device launch-app --appName "$PACKAGE.main" -d VirtualDevice
wait_event() {
  local event="$1" count="${2:-1}" timeout="${3:-35}"
  for ((i=0; i<timeout; i++)); do
    if [ "$(grep -c '\"event\":\"'"$event"'\"' "$OUT/native.log" || true)" -ge "$count" ]; then return; fi
    sleep 1
  done
  printf 'Waiting for %s failed.\n' "$event"
  return 1
}
wait_event seeked 1 35
wait_event voice-ready 1 15
sleep 2
WINDOW="$(xdotool getactivewindow)"
xdotool getwindowname "$WINDOW" > "$OUT/window-name.txt"
xdotool windowsize --sync "$WINDOW" 1280 720
xdotool windowmove --sync "$WINDOW" 60 70
xdotool windowfocus --sync "$WINDOW"
sleep 2
xdotool getwindowgeometry --shell "$WINDOW" > "$OUT/window-geometry.txt"
shot() { ffmpeg -hide_banner -loglevel error -y -f x11grab -video_size 1600x1000 -i "$DISPLAY" -frames:v 1 -update 1 "$OUT/$1.png"; }
shot ready
date +%s%3N > "$OUT/recording-start-ms.txt"
ffmpeg -hide_banner -loglevel error -y -f pulse -i eightagain.monitor -c:a flac "$OUT/native-audio.flac" > "$OUT/audio-recording.log" 2>&1 &
AUDIO_RECORDER=$!
ffmpeg -hide_banner -loglevel error -y -f x11grab -video_size 1600x1000 -framerate 15 -i "$DISPLAY" -f pulse -i eightagain.monitor -t 100 -c:v libx264 -preset ultrafast -crf 25 -pix_fmt yuv420p -c:a aac -b:a 96k "$OUT/native-practice.mp4" > "$OUT/recording.log" 2>&1 &
RECORDER=$!
xdotool key Return
sleep 4
shot slow-playing
wait_event phase-countdown
sleep 1
xdotool key Return
sleep 1
shot countdown-paused
sleep 3
shot countdown-held
xdotool key Return
wait_event phase-practice
sleep 2
shot your-turn
wait_event round-complete
sleep 3
shot automatic-replay
xdotool key Down
sleep 1
xdotool key Down
sleep 1
xdotool key Return
sleep 3
shot normal-speed
xdotool key Down
sleep 1
xdotool key Return
sleep 3
shot third-section
xdotool key Left
sleep 1
xdotool key Return
sleep 3
shot second-section
xdotool key Escape
sleep 2
shot back-paused
cp "$OUT/native.log" "$OUT/before-restart.log"
vega device terminate-app --appName "$PACKAGE.main" -d VirtualDevice
sleep 2
vega device launch-app --appName "$PACKAGE.main" -d VirtualDevice
sleep 12
shot restored
vega exec vda shell loggingctl config --set-level "$PACKAGE" info
PLAY_COUNT="$(grep -c '\"event\":\"playing\"' "$OUT/native.log")"
xdotool key Return
wait_event playing "$((PLAY_COUNT + 1))" 30
sleep 2
shot continued-after-restart
wait "$RECORDER"
wait_event session-complete 1 360
wait_event cue-ended 1 10
sleep 4
shot completed
pactl list sink-inputs short > "$OUT/pulse-inputs.txt"
kill -INT "$AUDIO_RECORDER"
wait "$AUDIO_RECORDER" || true
kill "$LOGGER" 2>/dev/null || true
vega exec vda shell loggingctl log -v "$PACKAGE" -S today > "$OUT/native-all.log" 2>&1
shot final
python3 - "$OUT" <<'PY'
import json, re, sys
from pathlib import Path
out = Path(sys.argv[1])
def events(path):
    return [dict(json.JSONDecoder().raw_decode(line.split('[EightAgain] ', 1)[1])[0],
                 pid=int(re.search(r'eightagain\[(\d+)\]', line).group(1)))
            for line in path.read_text().splitlines()
            if '[EightAgain] {' in line]
before = events(out / 'before-restart.log')
after = events(out / 'native.log')
saved_event = [e for e in before if e['event'] == 'progress-saved'][-1]
saved = saved_event['savedProgress']
assert saved['clip'] == 1 and saved['speed'] == 1 and saved['rounds'] == [1, 0, 0], saved
restored = [e for e in after if e['event'] == 'playing' and e['pid'] != saved_event['pid']][0]
assert restored['wallMs'] > before[-1]['wallMs'], restored
for key in ('clip', 'speed', 'rounds'):
    assert restored[key] == saved[key], (key, saved, restored)
assert 48 <= restored['contentTime'] < 60, restored
assert restored['running'] and not restored['paused'], restored
(out / 'progress-check.json').write_text(json.dumps({'saved': saved, 'restored': restored}, indent=2) + '\n')
print('Cross-process section, speed, round count and media position: PASS')
voice = [e for e in after if e['event'] == 'cue-playing']
assert {'watch', 'ready', 'practice', 'complete'} <= {e['cue'] for e in voice}, voice
assert all(e['running'] or e['phase'] == 'complete' for e in voice), voice
errors = [e for e in after if e['event'] == 'cue-error']
assert not errors, errors
paused = next(e for e in before if e['event'] == 'practice-paused' and e['phase'] == 'countdown')
resumed = next(e for e in before if e['event'] == 'practice-resumed' and e['wallMs'] > paused['wallMs'])
assert not [e for e in voice if paused['wallMs'] < e['wallMs'] < resumed['wallMs']], voice
(out / 'voice-check.json').write_text(json.dumps({'playing': voice,
    'countdown_pause': paused, 'countdown_resume': resumed, 'errors': errors}, indent=2) + '\n')
print('Four native voice cues, paused interval and completed routine: PASS')
PY
vega virtual-device stop
printf 'Native application run and remote recording completed.\n'
