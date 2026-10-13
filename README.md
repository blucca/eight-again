# Eight Again

Bring a dance lesson into the living room. Watch once, take five seconds, try the movement yourself, and see it again — with the TV remote in hand.

Eight Again is a native React Native application for **Fire TV with Vega OS 1.2**. Its included, openly licensed six-step lesson has three sections and three practice rounds per section. Choose 0.75× or normal speed; your own turn lasts as long as the example you just watched. Back, app backgrounding and the main button pause the routine.

**[Watch a complete practice round](https://blucca.github.io/eight-again/)** on the official Vega Virtual Device. Teachers can use the same page to arrange a free, three-section trial pack for an adult class.

Section, speed and today's completed rounds stay on the device. Reopening returns to that section, ready for you to resume; a new day keeps your section and speed and starts fresh round counts. The application works with the included local media. Its source uses the platform's persistent AsyncStorage library.

## Build and run

Use **Actions → Native television practice → Run workflow** for a clean build and an official Vega Virtual Device recording. The workflow reuses the verified [Vega TV Lab](https://github.com/blucca/vega-tv-lab) runtime: SDK 0.24.12112, React Native 0.83, Ubuntu 24.04 and KVM.

With that SDK installed locally, run `bash scripts/build.sh`. The build creates the official application shell under `temp/app`, overlays the complete source and assets in this repository, and produces VPKG files. Install the matching architecture on a compatible Vega device.

`node --experimental-strip-types src/lesson.check.ts` checks section boundaries, the shared original/slow timeline, nine-round completion, same-day and next-day progress, and paused practice time. The native workflow also checks the saved section, speed, rounds and media position after terminating and reopening the process.

The build uses the [documented React Native 0.83 storage alias](https://developer.amazon.com/docs/vega-api/0.24/react-native-async-storage.html): `@react-native-async-storage/async-storage` → `@amazon-devices/react-native-async-storage__async-storage@~2.1.0` in both dependencies and overrides.

## Native media

- `VideoPlayer` and `KeplerVideoSurfaceView` use local H.264 MP4 files through URL mode.
- Vega's current W3C API lists `playbackRate` as unsupported. Each speed therefore has a real, prepared video file. Original lesson seconds map to media seconds using `content / speed`.
- Chapter changes, replay and media keys use the supported `currentTime`, `play()` and `pause()` operations. Section completion follows the native media clock.
- Select activates a focused button; the D-pad moves focus. Play/pause and seek keys also work through the platform remote event API.

The official simulator is the current runtime acceptance environment. A hardware trial requires the actual Fire TV model, Vega OS 1.2, and installation using the Vega SDK. Appstore distribution includes a separate compatible-device review. [Platform field notes](evidence/platform-notes.md) record the runtime, media and storage findings.

## A teacher's practice pack

Start with one short solo exercise, three section names and their time ranges. For a class trial, email [belgialucca@gmail.com](mailto:belgialucca@gmail.com) with your dance style and Fire TV model. We agree the clip's trial-use permission and teacher credit, then prepare the pack within two working days. Two adult learners can try the same exercise on two separate days.

The trial pack is free. The proposed student price for the future app is a one-off **US$9.99**. The current preview is available through the source and SDK build route.

For a self-built pack, place the authorized 1× and 0.75× H.264 videos under `assets/raw/`; set their paths, section times, source credit and a distinct progress key in `src/lesson.ts`. Update the lesson heading and footer credit in `src/App.tsx` and the poster in `assets/images/`. Section times always refer to the original 1× video. Keep the source clip's usage terms with the resulting pack.

## Sample and licenses

The sample is **[Tutorial breakdance — Six Step](https://commons.wikimedia.org/wiki/File:Tutorial_breakdance_-_Six_Step.webm)** by **Neil Sweeney**, used under **[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)**. The Commons version is silent. We converted it from WebM to H.264, prepared a 0.75× version, selected three practice sections, and extracted a poster frame. The author retains the rights to the video; the sample credit describes the source material.

Barlow Condensed and Atkinson Hyperlegible fonts use the SIL Open Font License; license texts accompany the font files. Our application and scripts use the MIT license. Amazon's generated application shell and SDK follow their upstream licenses.
