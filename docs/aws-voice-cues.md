# Hear your turn

During a dance exercise, the learner looks away from the television. Eight Again gives each transition a short spoken cue, alongside its existing large visual prompt.

| Phase | Spoken cue |
| --- | --- |
| Watch or replay | “Watch the movement.” |
| Five-second preparation | “Ready. Make room.” |
| Independent practice | “Your turn.” |
| Nine rounds complete | “Practice complete. See you tomorrow.” |

## AWS integration

**Amazon Polly** generates these original prompts during pack preparation with the **Joanna neural** voice, **en-US**, MP3 at **24 kHz mono**, in **ap-southeast-2**. The public [generation manifest](../evidence/polly-cues.json) records the text, settings, files and synthesis times. The application bundles the MP3s and plays them through Vega's native `AudioPlayer`.

The installed practice routine runs offline. Its teacher clip, synthesized cues and saved progress stay on the television. AWS credentials belong in the pack builder's environment; the application package contains the generated audio. The voice describes the phase, while the teacher's original video demonstrates the movement.

### Generate another copy

With Python 3, FFprobe and an AWS CLI session authorized for `polly:SynthesizeSpeech`:

```sh
python scripts/generate-cues.py --receipts-dir "$HOME/private/eight-again-polly"
python scripts/generate-cues.py --check
```

The first command preserves matching bundled audio. Add `--force` to synthesize all four cues again; this sends the four displayed strings to Polly using your AWS account. The private receipt directory stores the request and response. The second command checks local MP3 format, duration and manifest consistency. To prepare different wording, edit `CUES` in the script and regenerate the assets before building the VPKG.

## Keeping voice and practice together

One practice snapshot drives the picture, preparation timer and voice. A cue plays when its phase is current and the app is foregrounded. Pause, Back, app backgrounding, section changes and speed changes stop the current prompt. Resuming a timed phase repeats that phase's cue. An old, cancelled play promise is scoped to its cue revision. An audio failure leaves the visual practice routine available and shows a short status message.

TV volume controls the cues. The original sample video remains silent.

## Runtime evidence

The v0.1.1 build completed all nine rounds on the official virtual device in runs [38673327124](https://github.com/blucca/eight-again/actions/runs/38673327124) and [38674471862](https://github.com/blucca/eight-again/actions/runs/38674471862). Both recordings contain all four completed prompts and actual playback of the saved second section at 1× in a new process.

The final workflow assertions exposed two recording-check boundaries: a stale saved-state log and a resume cue logged one millisecond before the resume marker. The current `scripts/verify-native.py` compares the final pre-close snapshot and the first resumed phase event; it passes on both downloaded recordings. Run `python3 scripts/verify-native.py PATH_TO_NATIVE_ARTIFACT` to repeat that check. The workflow's **Recheck recorded native practice** action also accepts an existing recording run ID.

The new film and 35-second preview retain the captured app audio. Four reference MP3s were matched against the recording using waveform windows and RMS envelopes. During the first recording's 4.236-second countdown pause, a central two-second interval measured −119.8 dBFS RMS. The [v0.1.1 development preview](https://github.com/blucca/eight-again/releases/tag/v0.1.1) contains three architecture packages and both recordings. [Recorded-native recheck 38677929010](https://github.com/blucca/eight-again/actions/runs/38677929010) passed using the second recording. The formal Devpost entry retains the original submitted film and its Fire TV / Open Source selections.

Native acceptance is collected by the repository's official Vega Virtual Device workflow: actual remote input, local MP3 playback, a paused preparation interval, a new-process resume and all nine rounds. The workflow captures the virtual device's audio output alongside the screen.

## Developer feedback

Polly supplied compact, consistent spoken assets through a single CLI operation per prompt. Packaging them once fits a small offline television lesson. The native `AudioPlayer` uses the already installed W3C media library.

The [Vega URL-mode guide](https://developer.amazon.com/docs/vega/0.24/media-player-select-playback) currently constructs `new AudioPlayer()` in its audio example while importing and typing `VideoPlayer`. We used the `AudioPlayer` export shown in Amazon's [audio sample](https://github.com/AmazonAppDev/vega-audio-sample/blob/14313653ea97b0a3ba6c91fe733ea7369fbdec96/src/utils/AudioHandler.ts). A matching import and reference type would make the short example executable.

The app's timing and pause behavior remain local code. We would reuse Polly for pack preparation and the native audio API for similarly brief television guidance.
