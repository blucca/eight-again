# Building a small rehearsal on Vega

These notes come from building and running Eight Again on the official Vega Virtual Device. The environment is SDK **0.24.12112**, Vega OS **1.2**, React Native **0.83**, and an Ubuntu 24.04 x86_64 runner with KVM.

## A reproducible virtual television

The [first runtime probe](https://github.com/blucca/vega-tv-lab/actions/runs/38449037674) built Amazon's Hello World template, launched it on the official device, accepted remote input, and recorded the screen.

- The version shown in the CI installation example, `0.24.9311`, returned `Version not found`. `vega sdk list-remote` supplied the available version used here.
- The virtual device's first run displayed an informational dialog about nested virtualization. After dismissing it, we waited for the guest connection and application service before installing. These readiness checks live in the runtime script.

Sources: [CI installation](https://developer.amazon.com/docs/vega/0.24/continuous-integration.html), [running an app](https://developer.amazon.com/docs/vega/0.24/run-apps.html).

## Video and television focus

Our first application build decoded the local H.264 sample and advanced the media clock while the video area stayed black. Rounded button backgrounds also disappeared. The successful [second run](https://github.com/blucca/eight-again/actions/runs/38456642571) includes both of these changes:

- Keep one `VideoPlayer` for the surface. Set its reference before awaiting initialization, and handle repeated surface announcements with the same instance.
- Use the virtual device's default OpenGL path with Mesa llvmpipe (`LIBGL_ALWAYS_SOFTWARE=1`). The earlier probe had explicitly disabled GL acceleration.

The recording shows the dance, visible remote focus, pause, replay, and both prepared speeds. The captured renderer is Mesa llvmpipe. Normal remote selection uses `Pressable.onPress`; media keys use the platform TV event hook.

Sources: [0.24 release notes and surface-event compatibility](https://developer.amazon.com/docs/vega/0.24/vega-release-notes.html), [native URL playback](https://developer.amazon.com/docs/vega/0.24/media-player-select-playback).

## Real slow motion

The current W3C API lists `playbackRate` among its unsupported properties. We prepared two actual H.264 files at 1× and 0.75×. A section boundary stays in the original lesson timeline; the matching media position is `contentSeconds / speed`.

For example, the first eight-second section takes 10.667 seconds at 0.75×. The learner's own turn receives the same duration. The repository's single runnable check covers the mapping, section bounds, daily progress, and paused practice clock.

## Seeking between sections

In the second run, changing sections during active playback produced a transient native clock jump: a seek to 48 seconds was followed by a 60.385-second reading, then a paused reading of 48.333 seconds. The practice controller now pauses before seeking and resumes from `seeked`. Media events read the current practice snapshot; a finished practice timer increments a round exactly once.

The complete routine is exercised by `scripts/runtime.sh`: watch, pause the preparation countdown, resume, practise, replay, change speed and section, pause with Back, then terminate and reopen the application.

## Small, local progress

The [migration dependency table](https://developer.amazon.com/docs/vega/0.24/rn-migration-dependencies.html) names `@amazon-devices/react-native-async-storage__async-storage`. In [run 38460265346](https://github.com/blucca/eight-again/actions/runs/38460265346), `vega project install` reported that name as outside the OS 1.2 / RN 0.83 profile and stopped the build.

The initial core `AsyncStorage` export acknowledged four writes. After terminating and reopening the process, the selected section, speed and completed rounds returned to their defaults. That run failed the persistence acceptance check.

The [storage library's React Native 0.83 instructions](https://developer.amazon.com/docs/vega-api/0.24/react-native-async-storage.html) specify an npm alias in both `dependencies` and `overrides`: `@react-native-async-storage/async-storage` resolves to `npm:@amazon-devices/react-native-async-storage__async-storage@~2.1.0`. This binds the system-deployed `RNCAsyncStorage` library. The build now follows that route; the native workflow compares the final saved section, speed and round counts with the actual media state after a process restart.

Stored values are the selected section, speed, date, and three section-level round counts. The next day's practice keeps the section and speed and begins a fresh set of rounds. A failed storage read pauses automatic saves so the existing record stays intact.

The platform's component-scoped app-state and Back hooks pause a running rehearsal. Returning to the application leaves the learner in control of resuming it.

## Useful platform improvements

- Keep CI installation examples aligned with a discoverable SDK release.
- Include GL-backed headless video capture and first-boot readiness in the virtual-device examples.
- Align storage migration package names with the CLI's actual OS / RN profile.
- Add a short local-video example covering repeated surface events, paused seeking, and component backgrounding.
