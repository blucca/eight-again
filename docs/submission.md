# Eight Again — submission material

[Submitted October 14, 2026](https://devpost.com/software/eight-again) to the **Fire TV** track of Build, Ship, Shape: Amazon Developer Hackathon, with **Vega TV Lab** entered in the Open Source Mini Challenge.

The formal Devpost entry retains its original 101-second YouTube film and Fire TV / Open Source selections. The repository now includes v0.1.1 with spoken prompts; the current release notes and AWS integration material below accompany that public build.

## Entry fields

- **Project name:** Eight Again
- **Tagline:** Your dance lesson, five minutes of practice, one TV remote.
- **Project status:** New; created during the hackathon in October 2026.
- **Built with:** React Native, TypeScript, Vega OS, Fire TV, Amazon Polly, FFmpeg, GitHub Actions.
- **Source:** https://github.com/blucca/eight-again
- **Demo video:** https://youtu.be/0WHImznAMeo
- **VPKG prerelease:** https://github.com/blucca/eight-again/releases/tag/v0.1.1
- **Practice preview and teacher invitation:** https://blucca.github.io/eight-again/
- **Setup and testing:** https://github.com/blucca/eight-again#build-and-run
- **Product feedback:** https://github.com/blucca/eight-again/blob/main/docs/submission.md#product-feedback
- **Friction log:** https://github.com/blucca/eight-again/blob/main/docs/submission.md#friction-log

## Project story

### Bring this week's dance lesson home

A teacher gives an adult class a short combination to practise. At home, the learner needs room to move, a clear example, and a moment to try it from memory. Eight Again turns that short lesson into a small, repeatable television rehearsal.

The product starts with the teacher's material: one authorized clip and three named sections. Our included sample uses Neil Sweeney's openly licensed six-step tutorial. The teacher-pack instructions describe how to prepare another lesson with its own timing, credit and saved progress.

### Watch. Get ready. Your turn. Again.

Eight Again is a native app for **Fire TV with Vega OS 1.2**. With the D-pad and Select, choose a section, select 0.75× or normal speed, and start:

1. Watch the selected movement once.
2. Take five seconds to get into position.
3. Try it from memory for the same duration as the example.
4. Watch again, completing three rounds per section and nine rounds for the lesson.

The remote can pause the entire routine, including the countdown and the learner's own turn. Back and app backgrounding also pause practice. Sections advance when their three rounds are complete.

Section, speed and today's completed rounds stay on the TV. Reopening the app returns to that section, paused and ready to continue. On a new day, section and speed remain; the nine-round count starts fresh. The included local media supports the complete routine offline.

### Hear your turn when you look away

The learner's own turn is spent moving, with their eyes often away from the screen. Short spoken cues now mark watching, preparation, independent practice and completion. Pause and Back stop picture and voice together; resuming repeats the current phase's prompt.

Amazon Polly generates the four original prompts during lesson-pack preparation. Vega's native `AudioPlayer` plays those bundled MP3s. The television performs the complete routine offline, with the same large visual cues alongside the voice. The [integration guide](https://github.com/blucca/eight-again/blob/main/docs/aws-voice-cues.md) includes the generator, synthesis settings and native runtime evidence.

### Built and exercised on an actual Vega runtime

We use React Native 0.83, Vega SDK 0.24.12112, the native W3C media player, TV remote events, component-scoped lifecycle hooks and the platform's persistent AsyncStorage library.

Each playback speed has a prepared H.264 file. A shared original-content timeline keeps section boundaries and practice durations aligned across both files. Native media events drive the transition into preparation; one practice-state snapshot coordinates playback, timing and remote input.

Our official Vega Virtual Device workflow builds the package on Ubuntu with KVM, sends actual remote key events, records the screen, and terminates and relaunches the process. The [successful restart check](https://github.com/blucca/eight-again/actions/runs/38466620142) compares the new process's playing section, speed and completed rounds with the saved values.

Two details shaped the final app: an early native build showed a moving media clock over a black surface, and the initial storage path lost progress after relaunch. We repaired the GL/surface setup and used the documented storage alias. Those trials made visible frames and new-process resumption part of acceptance.

### A rehearsal notebook for the big screen

Lilac paper, large condensed headings and clear purple focus give the screen the feel of a rehearsal notebook. An apricot full-stage cue marks preparation and independent practice. The lesson, current section and completed rounds remain visible. The learner has a clear endpoint: nine rounds, then tomorrow.

### The next real classroom

A free teacher trial is available through the public preview page. Individual invitations have been sent to three adult-class teachers. The next milestone is a teacher assigning an authorized pack and a learner practising on two separate days. The proposed student price is a one-time **US$9.99**; the teacher trial is free.

The current installation path uses the Vega SDK and a compatible Vega OS 1.2 device or the official virtual device. A retail-device trial and Appstore distribution are the next delivery stages.

### Credits

The sample is [Tutorial breakdance — Six Step](https://commons.wikimedia.org/wiki/File:Tutorial_breakdance_-_Six_Step.webm) by **Neil Sweeney**, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). We converted the silent Commons video to H.264, prepared a 0.75× version, selected three sections and extracted a poster frame. Barlow Condensed and Atkinson Hyperlegible use the SIL Open Font License. Application code and scripts use MIT; upstream SDK materials retain their licenses.

Eight Again was developed by an autonomous Codex AI engineering agent through the blucca project account.

## Product feedback

### 1. Which developer tools, APIs, and SDKs did you use and for what?

- **Vega SDK 0.24.12112 / CLI 1.4.4:** generate the official application shell, install profile-compatible dependencies, build VPKGs, and install and launch the app on the official Vega Virtual Device with Vega OS 1.2.
- **React Native 0.83 and Amazon's Kepler APIs:** television layout, focus and Select handling; media-key events; component-scoped app-state and Back handling.
- **`@amazon-devices/react-native-w3cmedia`:** `VideoPlayer` and `KeplerVideoSurfaceView` for local H.264 playback, seeking and native media events; `AudioPlayer` for the offline phase prompts.
- **Amazon's AsyncStorage 2.1.x through the documented RN 0.83 npm alias:** persistent section, speed, date and round counts using the system-deployed `RNCAsyncStorage` library.
- **GitHub Actions, Ubuntu 24.04, KVM, Xvfb, Openbox and xdotool:** a reproducible official virtual television, remote-control input and process-restart acceptance run. **GitHub Pages** hosts the practice preview and teacher invitation.
- **TypeScript and Node.js 22:** application logic and a focused executable check for lesson timing, completion, daily progress and paused practice time. **FFmpeg:** prepare the two video speeds, extract the poster and capture the native runtime.
- **Codex:** research, product design, implementation, native-run diagnosis and submission documentation. **Amazon Polly (neural Joanna, en-US):** generate the four original in-app phase prompts through `polly:SynthesizeSpeech` in `ap-southeast-2`; bundle the resulting MP3s for native offline playback. Polly also generated the demonstration film’s English narration. [Source and integration](https://github.com/blucca/eight-again/blob/main/docs/aws-voice-cues.md).

### 2. For each tool, API, or SDK used in your project, what worked well?

The Vega CLI's template, package and device commands provided a complete build-to-screen route. The official virtual device made the actual television runtime available in a clean KVM job.

React Native focusable controls and Kepler's media-key, Back and app-state hooks fit the whole rehearsal. The native media clock and `seeked` event gave us concrete section boundaries. After adopting the documented RN 0.83 storage alias, a new application process recovered the selected section, speed and completed rounds and resumed the correct media section.

GitHub Actions and the X display tools made the same native run repeatable. GitHub Pages gives teachers an ordinary link to a real recorded practice round. TypeScript keeps the practice rules in a small shared module; Node executes its focused check directly. FFmpeg produces both real speeds from the same licensed clip. Polly supplied short, consistent MP3 prompts for the app and synthesized English narration for the film. Pack-time synthesis fits the offline practice routine; the same prompts are reused across rounds. Codex connected documentation, source changes and observed native behavior through successive working builds.

### 3. For each tool, API, or SDK used in your project, what needs work?

The most useful improvements are a current SDK installation example, first-boot readiness guidance, a GL-backed headless-media example, and one consistent RN 0.83 persistence setup. The following entries record the attempted task, actual result, working route and suggested change. The audio URL-mode example also needs matching `AudioPlayer` import and reference types; the official audio sample supplies the working export, documented in our AWS integration guide.

### Friction log

Observed October 14, 2026 with SDK 0.24.12112, CLI 1.4.4, Vega OS 1.2, React Native 0.83, Ubuntu 24.04 and KVM.

#### 1. Keep the CI installation example executable

- **Task:** install the documented SDK version on a clean CI runner.
- **Steps:** use version `0.24.9311` from the CI installation example; inspect available releases with `vega sdk list-remote`.
- **Expected:** the example's version resolves to a downloadable SDK.
- **Actual:** the registry returned `Version not found`; the release list included `0.24.12112`.
- **Severity:** Medium — setup stopped at SDK selection.
- **Workaround:** pin the available `0.24.12112` release, then complete the official template build and virtual-device run.
- **Actionable suggestion:** **Important.** Check the CI example against the release registry and show `vega sdk list-remote` immediately beside the version pin.
- **Evidence:** [official CI guide](https://developer.amazon.com/docs/vega/0.24/continuous-integration.html), [Vega TV Lab notes and successful run](https://github.com/blucca/vega-tv-lab#run).

#### 2. Expose guest readiness after the first virtual-device start

- **Task:** start a clean official virtual device and immediately install an application.
- **Steps:** start VVD on the hosted KVM runner; receive the initial ready message; inspect the visible window and guest connection.
- **Expected:** the install step has a clear readiness condition covering the guest's application service.
- **Actual:** the first run opened a nested-virtualization information dialog, and the guest's application service was still starting after the initial ready message.
- **Severity:** Medium — additional first-boot orchestration was needed before installation.
- **Workaround:** give the dialog focus with Openbox, acknowledge it, wait for VDA, and require a successful `running-apps` response.
- **Actionable suggestion:** **Important.** Document first-boot dialogs and provide a guest-service-ready wait command for CI.
- **Evidence:** [executable first-boot probe](https://github.com/blucca/vega-tv-lab/blob/main/probe.sh), [official run guide](https://developer.amazon.com/docs/vega/0.24/run-apps.html).

#### 3. Provide a headless local-video example with surface lifecycle handling

- **Task:** render a local H.264 lesson and visible remote focus on VVD.
- **Steps:** extend the Hello Vega runtime with a video surface; use the initial probe's explicit `--no-gl-accel` configuration; inspect playback and recorded frames.
- **Expected:** decoded media appears in the video surface and focused controls retain their backgrounds.
- **Actual:** the media clock advanced while the video area stayed black. Rounded control backgrounds also disappeared.
- **Severity:** High — native video acceptance failed.
- **Workaround:** keep one `VideoPlayer` per surface, store its reference before initialization and reuse it for repeated surface announcements; use default GL with Mesa llvmpipe (`LIBGL_ALWAYS_SOFTWARE=1`). The combined change produced visible dance footage and focus backgrounds.
- **Actionable suggestion:** **Important.** Publish a supported headless-rendering recipe and a local-video sample with repeated surface events, paused seeking and background handling.
- **Evidence:** [working native run](https://github.com/blucca/eight-again/actions/runs/38456642571), [platform field notes](../evidence/platform-notes.md#video-and-television-focus), [official surface compatibility notes](https://developer.amazon.com/docs/vega/0.24/vega-release-notes.html).

#### 4. Align the storage migration table with the RN 0.83 install route

- **Task:** preserve the selected section, speed and completed rounds after the process exits.
- **Steps:** install the package name listed in the migration dependency table; try the initial core AsyncStorage export; then follow the storage library's RN 0.83 alias instructions.
- **Expected:** the documented install route resolves within the OS 1.2 / RN 0.83 profile and restores saved values after relaunch.
- **Actual:** installing the migration table's direct Amazon package name stopped with a profile-compatibility error. The initial core export acknowledged four writes; relaunch returned the default values and failed the persistence check.
- **Severity:** High — build setup and cross-day resumption were affected.
- **Workaround:** alias `@react-native-async-storage/async-storage` to `npm:@amazon-devices/react-native-async-storage__async-storage@~2.1.0` in both `dependencies` and `overrides`. This binds `RNCAsyncStorage`; the new process then resumed the saved second section at 1× with the saved round count.
- **Actionable suggestion:** **Important.** Put the alias, import path, profile requirement and a terminate/relaunch example together in the migration table and package-install guide.
- **Evidence:** [migration table](https://developer.amazon.com/docs/vega/0.24/rn-migration-dependencies.html), [library-specific instructions](https://developer.amazon.com/docs/vega-api/0.24/react-native-async-storage.html), [failed direct-package build](https://github.com/blucca/eight-again/actions/runs/38460265346), [successful new-process playback check](https://github.com/blucca/eight-again/actions/runs/38466620142).

#### 5. Include media logging budgets in the CI example

- **Task:** capture native phase prompts and use their events to drive the remote-control acceptance run.
- **Steps:** enable application info logs, initialize video and audio, then wait for the first voice event.
- **Expected:** the application's structured transition events remain visible during media startup.
- **Actual:** the process reached its 300-lines-per-second limit. Startup logs were suppressed. After raising the logging budget, native `playing` and `ended` messages were visible and audio was captured, while the application-level `playing` callback log stayed absent. Log-driven acceptance attempts stopped at those event waits.
- **Severity:** Low — acceptance orchestration stopped while the underlying media played.
- **Workaround:** use the documented `loggingctl config --set-rate io.github.blucca.eightagain 1000` for this CI run; drive cue completion checks with delivered `ended` events and compare the captured audio with the bundled prompts.
- **Actionable suggestion:** **Nice to have.** Include the logging-rate setting and a sample suppression message in the media CI recipe, so developers can distinguish event capture from playback behavior.
- **Evidence:** [recorded attempt](https://github.com/blucca/eight-again/actions/runs/38671124230), [LoggingCtl configuration guide](https://developer.amazon.com/docs/vega/0.24/loggingctl.html), [runtime script](https://github.com/blucca/eight-again/blob/main/scripts/runtime.sh).

### 4. For each tool, API, or SDK used in your project, how was your onboarding experience?

The first complete Hello Vega CI job took **5 minutes 13 seconds**. It installed the official SDK, generated and built the template, launched the official virtual device, accepted remote input and recorded the screen. The published [Vega TV Lab](https://github.com/blucca/vega-tv-lab) preserves this route.

Building Eight Again then added native video, remote practice controls and persistent progress. The main onboarding work was reconciling the SDK example, guest readiness, rendering configuration and storage alias described above. The W3C API's documented `playbackRate` capability led us to prepared 1× and 0.75× media files.

An existing AWS CLI profile generated the four Polly prompts. A local check reads each MP3 and its generation manifest before packaging. Native playback uses the same installed W3C media dependency as the tutorial video.

Node, TypeScript and FFmpeg supplied direct commands for the small domain check and media preparation. GitHub Actions and Pages use the workflows in the repository. Codex supported the end-to-end build and interpretation of actual simulator output.

### 5. Would you build with these devices and services again?

**Yes.** Native Fire TV controls, a large display, local media and persistent progress suit a short daily rehearsal. React Native and Vega's media/lifecycle APIs support that experience with a compact application. The official virtual device, KVM workflow and recorded input make it practical to reproduce the result. We would reuse TypeScript, Node, FFmpeg, GitHub Actions/Pages and Codex for the same build-and-demonstrate loop. Polly suits preparing reusable, short instructions while local playback preserves an offline lesson. Our next device milestone is an adult-class trial on a compatible retail Vega device.

## Feature requests

1. **Important — Playback-speed control for local video.** A supported rate API would let one lesson asset cover both demonstration speeds and reduce teacher-pack preparation and package size. Our current app ships two prepared files; the [0.24 W3C API](https://developer.amazon.com/docs/vega-api/0.24/README.amazon-devices_react-native-w3cmedia) lists `playbackRate` as unsupported.
2. **Important — A media-capable headless CI starter.** Include renderer configuration, guest readiness, one local video, D-pad/Select input, component backgrounding and a recorded frame. This covers the route from a clean runner to a demonstrable television app.
3. **Important — A persistent-state starter for RN 0.83.** Include the exact npm alias and a save → terminate → relaunch check. Daily practice depends on the return experience.

## AI tools used

Codex performed research, product and visual design, React Native implementation, workflow scripting, diagnosis of native recordings and logs, and documentation. Amazon Polly (neural Joanna voice) generated the four original phase prompts used in the installed app and the synthesized English narration for the demonstration film. The delivered app executes local lesson, playback and progress logic on Vega. The project account holder handles platform identity and account verification.

## Additional Open Source Mini contribution — Vega TV Lab

- **Contribution URL:** https://github.com/blucca/vega-tv-lab/blob/825daf2b874e669cc95d05737f87cda0bf38d4ff/probe.sh
- **Project repository URL:** https://github.com/blucca/vega-tv-lab
- **GitHub username:** blucca

**What we created:** a new MIT-licensed, executable CI probe for Amazon's official Vega Virtual Device, created during the hackathon. Its workflow installs the official SDK, builds Hello Vega, starts a virtual television, sends remote key events and records the resulting screen.

**How it works:** an Ubuntu 24.04 KVM runner hosts VVD alongside Xvfb and Openbox. The script handles the initial virtualization dialog, waits for the guest connection and application service, installs and launches the package, then drives and records the UI. SDK and generated files are fetched into a temporary directory. The repository publishes a successful run, actual screenshots and a 20-second recording.

**Why it matters:** it gives another Vega developer a working path from source to a recorded official-runtime result. Eight Again adapts that route in its own native workflow and extends it with video-capable rendering, a complete rehearsal and cross-process progress checks. The standalone Lab probe covers Hello Vega; Eight Again carries the product-specific media acceptance.

## AWS integration — release documentation

**Amazon Polly** creates four spoken phase prompts for the actual Fire TV rehearsal: “Watch the movement,” “Ready. Make room,” “Your turn,” and the nine-round completion message. A standard-AWS-CLI generation script writes the MP3s and a public settings manifest; native `AudioPlayer` plays the bundled assets when the practice snapshot reaches the matching phase. Pause, Back, backgrounding, section changes and speed changes stop the current cue. A cue revision scopes cancelled playback errors to their original request.

This lets a learner hear the next step while looking away from the television. The completed lesson runs offline, with TV-volume control and the original large visual prompts. Source, generation steps, service feedback and native audio evidence are linked from [the integration guide](https://github.com/blucca/eight-again/blob/main/docs/aws-voice-cues.md). The separate Polly film-narration use remains documented above.
