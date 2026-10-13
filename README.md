# Eight Again

Bring a dance lesson into the living room. Pick a section, slow it down, and go again with the TV remote.

Eight Again is a native React Native application for **Fire TV with Vega OS 1.2**. This first slice plays an included, openly licensed six-step tutorial with three sections, precise replay and two prepared speeds. Work toward a complete practice session continues here.

## Build and run

Use **Actions → Native television practice → Run workflow** for a clean build and an official Vega Virtual Device recording. The workflow reuses the verified [Vega TV Lab](https://github.com/blucca/vega-tv-lab) runtime: SDK 0.24.12112, React Native 0.83, Ubuntu 24.04 and KVM.

With that SDK installed locally, run `bash scripts/build.sh`. The build creates the official application shell under `temp/app`, overlays the complete source and assets in this repository, and produces VPKG files. Install the matching architecture on a compatible Vega device.

`node --experimental-strip-types src/lesson.check.ts` checks section boundaries and the shared original/slow timeline.

## Native media

- `VideoPlayer` and `KeplerVideoSurfaceView` use local H.264 MP4 files through URL mode.
- Vega's current W3C API lists `playbackRate` as unsupported. Each speed therefore has a real, prepared video file. Original lesson seconds map to media seconds using `content / speed`.
- Chapter changes, replay and media keys use the supported `currentTime`, `play()` and `pause()` operations. Section completion follows the native media clock.
- Select activates a focused button; the D-pad moves focus. Play/pause and seek keys also work through the platform remote event API.

The official simulator is the current runtime acceptance environment. Appstore distribution includes a separate compatible-device review.

## Sample and licenses

The sample is **[Tutorial breakdance — Six Step](https://commons.wikimedia.org/wiki/File:Tutorial_breakdance_-_Six_Step.webm)** by **Neil Sweeney**, used under **[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)**. The Commons version is silent. We converted it from WebM to H.264, prepared a 0.75× version, selected three practice sections, and extracted a poster frame. The author retains the rights to the video; the sample credit describes the source material.

Barlow Condensed and Atkinson Hyperlegible fonts use the SIL Open Font License; license texts accompany the font files. Our application and scripts use the MIT license. Amazon's generated application shell and SDK follow their upstream licenses.
