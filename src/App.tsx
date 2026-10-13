import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {HWEvent, useTVEventHandler, useKeplerAppStateManager, useKeplerBackHandler} from '@amazon-devices/react-native-kepler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {VideoPlayer, KeplerVideoSurfaceView} from '@amazon-devices/react-native-w3cmedia';
import {lesson, Progress, mediaTime, contentTime, sourceFor, clampToClip, clock,
  countdownMs, saveKey, restoreProgress, finishRound, isComplete, tickRemaining} from './lesson';

const colors = {
  floor: '#DCD7ED', ink: '#2B2C50', paper: '#FBF8FF', focus: '#6E4DD5',
  soft: '#BBB2D0', muted: '#585571', apricot: '#F5A97A', sage: '#90BFAE',
};
type Phase = 'watch' | 'countdown' | 'practice' | 'complete';
type PracticeView = {
  progress: Progress; phase: Phase; remainingMs: number; position: number;
  running: boolean; busy: boolean; ready: boolean; hydrated: boolean; hasFrame: boolean;
  error: string; saveError: boolean; focus: string;
};

function PracticeButton({id, label, action, primary, focused, onFocus}: {
  id: string; label: string; action: () => void; primary?: boolean;
  focused: boolean; onFocus: () => void;
}) {
  return <Pressable hasTVPreferredFocus={id === 'play'} onFocus={onFocus} onPress={action}
    accessibilityRole="button" accessibilityLabel={label}
    style={[styles.button, primary && styles.primary, focused && styles.focused]}>
    <Text style={[styles.buttonText, (primary || focused) && styles.focusText]}>{label}</Text>
  </Pressable>;
}

export const App = () => {
  const {width, height} = useWindowDimensions();
  const appState = useKeplerAppStateManager();
  const backHandler = useKeplerBackHandler();
  const [view, setView] = useState<PracticeView>({
    progress: restoreProgress(null), phase: 'watch', remainingMs: 0, position: lesson.clips[0].start,
    running: false, busy: true, ready: false, hydrated: false, hasFrame: false, error: '', saveError: false, focus: 'play',
  });
  const state = useRef(view);
  const playerRef = useRef<VideoPlayer | null>(null);
  const control = useRef({target: lesson.clips[0].start, playAfterSeek: false, initialized: false, seeking: false});
  const lastLog = useRef(0);
  const remoteHandler = useRef<(event: HWEvent) => void>(() => {});
  const foreground = useRef(true);
  const storageReadable = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const {progress, phase} = view;
  const clip = lesson.clips[progress.clip];

  function update(patch: Partial<PracticeView>) {
    state.current = {...state.current, ...patch};
    setView(state.current);
  }

  function log(event: string, detail: object = {}) {
    const p = playerRef.current, s = state.current;
    console.log('[EightAgain] ' + JSON.stringify({event, wallMs: Date.now(), mediaTime: p?.currentTime,
      contentTime: p ? contentTime(p.currentTime, s.progress.speed) : undefined,
      speed: s.progress.speed, clip: s.progress.clip, phase: s.phase, running: s.running,
      remainingMs: s.remainingMs, rounds: s.progress.rounds,
      paused: p?.paused, seeking: p?.seeking, ...detail}));
  }

  function fail(problem: unknown) {
    control.current.playAfterSeek = false;
    update({running: false, busy: false, error: control.current.initialized
      ? 'Video stopped. Select Play to reload this lesson.'
      : 'Video setup stopped. Press Home, then reopen Eight Again.'});
    log('error', {detail: String(problem)});
  }

  function pause(reason = 'remote') {
    control.current.playAfterSeek = false;
    update({running: false});
    playerRef.current?.pause();
    log('practice-paused', {reason});
  }

  function play() {
    if (!playerRef.current) return;
    update({running: true});
    playerRef.current.play().catch(fail);
  }

  function seekTo(target: number, resume: boolean) {
    const p = playerRef.current, s = state.current;
    control.current.target = clampToClip(target, lesson.clips[s.progress.clip]);
    control.current.playAfterSeek = resume;
    update({running: resume});
    if (!p || !control.current.initialized) return;
    // Stop the native clock before changing sections; resume from the seeked event.
    p.pause();
    if (Math.abs(contentTime(p.currentTime, s.progress.speed) - control.current.target) < 0.08) {
      update({busy: false});
      if (resume) play();
      return;
    }
    control.current.seeking = true;
    update({busy: true});
    p.currentTime = mediaTime(control.current.target, s.progress.speed);
    log('seek-request', {target: control.current.target});
  }

  function watchAgain(index = state.current.progress.clip) {
    const current = state.current.progress;
    update({phase: 'watch', remainingMs: 0, progress: {...restoreProgress(current), clip: index}});
    seekTo(lesson.clips[index].start, true);
    log('watch-again');
  }

  function toggle() {
    const p = playerRef.current;
    const s = state.current;
    if (!p || !control.current.initialized) return;
    const today = restoreProgress(s.progress);
    if (today.day !== s.progress.day) {
      pause('new-day');
      update({progress: today, phase: 'watch', remainingMs: 0});
      watchAgain();
      return;
    }
    if (s.error) {
      update({error: '', busy: true, running: true, phase: 'watch'});
      control.current.target = lesson.clips[s.progress.clip].start;
      control.current.playAfterSeek = true;
      p.src = sourceFor(s.progress.speed);
    } else if (s.running) {
      pause();
    } else if (s.phase === 'complete') {
      update({progress: {...s.progress, rounds: lesson.clips.map(() => 0)}});
      watchAgain();
    } else if (s.phase === 'countdown' || s.phase === 'practice') {
      update({running: true});
      log('practice-resumed');
    } else if (!s.busy) {
      if (contentTime(p.currentTime, s.progress.speed) >= lesson.clips[s.progress.clip].end - 0.1) watchAgain();
      else {control.current.playAfterSeek = true; play();}
    }
  }

  function changeSpeed() {
    const p = playerRef.current, s = state.current;
    if (!p || !control.current.initialized || s.busy) return;
    const speed = s.progress.speed === 0.75 ? 1 : 0.75;
    control.current.target = s.phase === 'watch'
      ? clampToClip(contentTime(p.currentTime, s.progress.speed), lesson.clips[s.progress.clip])
      : lesson.clips[s.progress.clip].start;
    control.current.playAfterSeek = s.running;
    p.pause();
    update({progress: {...s.progress, speed}, phase: 'watch', busy: true, ready: false, remainingMs: 0});
    p.src = sourceFor(speed);
    log('change-speed', {target: control.current.target});
  }

  function beginCountdown() {
    const s = state.current;
    if (s.phase !== 'watch' || !s.running || control.current.seeking || !s.ready ||
        s.busy || s.error || !foreground.current) return;
    control.current.playAfterSeek = false;
    update({phase: 'countdown', remainingMs: countdownMs, busy: false,
      position: lesson.clips[s.progress.clip].end});
    playerRef.current?.pause();
    log('phase-countdown');
  }

  useEffect(() => {
    let live = true;
    (async () => {
      let saved: unknown = null;
      try {
        saved = JSON.parse(await AsyncStorage.getItem(saveKey) || 'null');
        storageReadable.current = true;
      }
      catch (error) {
        console.error('[EightAgain] Progress read failed:', String(error));
        if (live) update({saveError: true});
      }
      if (!live) return;
      const progress = restoreProgress(saved);
      control.current.target = lesson.clips[progress.clip].start;
      update({progress, position: control.current.target, hydrated: true, phase: isComplete(progress) ? 'complete' : 'watch'});
      log('progress-restored', {storedValue: saved});
    })();
    return () => {live = false;};
  }, []);

  useEffect(() => {
    if (!view.hydrated || !storageReadable.current) return;
    const saved = JSON.stringify(progress);
    saveQueue.current = saveQueue.current.then(() => AsyncStorage.setItem(saveKey, saved))
      .then(() => {update({saveError: false}); log('progress-saved', {savedProgress: JSON.parse(saved)});})
      .catch(error => {
        console.error('[EightAgain] Progress save failed:', String(error));
        update({saveError: true});
      });
  }, [view.hydrated, progress]);

  useEffect(() => {
    foreground.current = appState.getCurrentState() === 'active';
    const subscription = appState.addEventListener('change', next => {
      foreground.current = next === 'active';
      if (next !== 'active') pause('background');
      else {
        const progress = restoreProgress(state.current.progress);
        if (progress.day !== state.current.progress.day) {
          update({progress, phase: 'watch', remainingMs: 0});
          seekTo(lesson.clips[progress.clip].start, false);
        }
      }
    });
    const blur = appState.addEventListener('blur', () => pause('blur'));
    const back = backHandler.addEventListener('hardwareBackPress', () => {
      if (state.current.running) {pause('back'); return true;}
      return false;
    });
    return () => {subscription.remove(); blur.remove(); back.remove();};
  }, [appState, backHandler]);

  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'practice') return;
    let previous = Date.now();
    const interval = setInterval(() => {
      const now = Date.now(), s = state.current;
      if (s.phase !== phase) return;
      const active = s.running && foreground.current && s.ready && !s.busy && !s.error;
      const remainingMs = tickRemaining(s.remainingMs, now - previous, !!active);
      previous = now;
      if (!active) return;
      if (remainingMs > 0) {update({remainingMs}); return;}
      clearInterval(interval);
      if (s.phase === 'countdown') {
        const section = lesson.clips[s.progress.clip];
        update({phase: 'practice', remainingMs: mediaTime(section.end - section.start, s.progress.speed) * 1000});
        log('phase-practice');
      } else if (s.phase === 'practice') {
        const next = finishRound(s.progress);
        update({progress: next, remainingMs: 0, phase: isComplete(next) ? 'complete' : 'watch'});
        log('round-complete');
        if (isComplete(next)) {update({running: false}); log('session-complete');}
        else seekTo(lesson.clips[next.clip].start, true);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phase]);

  remoteHandler.current = event => {
    if (event.eventKeyAction !== 0) return;
    log('remote', {key: event.eventType});
    if (event.eventType === 'playpause' || event.eventType === 'playPause') toggle();
    if (event.eventType === 'rewind' || event.eventType === 'skip_backward' ||
        event.eventType === 'fastforward' || event.eventType === 'skip_forward') {
      const p = playerRef.current, s = state.current;
      if (p && s.phase === 'watch' && !s.busy) {
        const delta = event.eventType === 'rewind' || event.eventType === 'skip_backward' ? -3 : 3;
        seekTo(contentTime(p.currentTime, s.progress.speed) + delta, s.running);
      }
    }
  };
  useTVEventHandler(useCallback((event: HWEvent) => remoteHandler.current(event), []));

  async function onSurfaceCreated(handle: string) {
    log('surface-request', {handle, hasPlayer: !!playerRef.current});
    if (playerRef.current) return;
    try {
      const p = new VideoPlayer();
      playerRef.current = p;
      await p.initialize();
      if (playerRef.current !== p) return;
      p.setSurfaceHandle(handle);
      control.current.initialized = true;
      function listen(event: string, handler: () => void) {
        p.addEventListener(event, () => {if (playerRef.current === p) handler();});
      }
      listen('loadedmetadata', () => {
        log('loadedmetadata', {duration: p.duration, src: p.src});
        control.current.seeking = true;
        p.currentTime = mediaTime(control.current.target, state.current.progress.speed);
      });
      listen('seeked', () => {
        control.current.seeking = false;
        update({busy: false, ready: true, position: contentTime(p.currentTime, state.current.progress.speed)});
        log('seeked', {target: control.current.target});
        if (control.current.playAfterSeek && state.current.running) play();
      });
      listen('playing', () => {
        if (!state.current.running || state.current.phase !== 'watch') {p.pause(); return;}
        update({busy: false, ready: true, hasFrame: true}); log('playing');
      });
      listen('pause', () => log('pause'));
      listen('waiting', () => {update({busy: true}); log('waiting');});
      listen('canplay', () => {
        if (!p.seeking && !control.current.seeking) update({busy: false, ready: true});
        log('canplay');
      });
      listen('error', () => fail(p.error?.message || 'Native media error'));
      listen('ended', beginCountdown);
      listen('timeupdate', () => {
        const s = state.current;
        if (s.phase !== 'watch' || control.current.seeking) return;
        const value = contentTime(p.currentTime, s.progress.speed);
        update({position: value});
        if (Date.now() - lastLog.current > 900) {lastLog.current = Date.now(); log('timeupdate');}
        if (!p.seeking && !p.paused && value >= lesson.clips[s.progress.clip].end) beginCountdown();
      });
      p.autoplay = false;
      p.src = sourceFor(state.current.progress.speed);
      log('surface-created');
    } catch (problem) {fail(problem);}
  }

  async function onSurfaceDestroyed(handle: string) {
    const p = playerRef.current;
    playerRef.current = null;
    control.current.initialized = false;
    control.current.playAfterSeek = false;
    update({running: false, ready: false, busy: true, hasFrame: false});
    if (p) {p.clearSurfaceHandle(handle); await p.deinitialize();}
  }

  const elapsed = Math.max(0, Math.min(clip.end - clip.start, view.position - clip.start));
  const total = mediaTime(clip.end - clip.start, progress.speed);
  const completed = progress.rounds.reduce((sum, n) => sum + n, 0);
  const timed = phase === 'countdown' || phase === 'practice';
  const status = view.error || (view.busy ? 'Getting the step ready…' : phase === 'complete'
    ? 'Nine rounds. A little progress to keep.' : timed ? (view.running
      ? phase === 'countdown' ? 'Take your place.' : 'Your turn. Keep moving.' : 'Take your time. Resume when ready.')
      : view.running ? 'Watch once. Then try it yourself.' : 'Watch, make room, try it. Three rounds each.');
  const primaryLabel = view.error ? 'Play' : view.running ? 'Pause practice' : phase === 'complete'
    ? 'Practice again' : timed ? 'Resume practice' : completed ? 'Continue practice' : 'Start practice';

  return <View style={styles.screen}>
    <View style={[styles.canvas, {transform: [{scale: Math.min(width / 1280, height / 720)}]}]}>
      <View style={styles.header}>
        <Text style={styles.brand}>Eight Again</Text>
        <Text style={styles.tagline}>{completed ? `${completed} of 9 rounds today` : 'A little practice. A little progress.'}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.stageColumn}>
          <View style={styles.videoFrame}>
            {view.hydrated && <KeplerVideoSurfaceView style={styles.video} scalingmode="fit"
              onSurfaceViewCreated={onSurfaceCreated} onSurfaceViewDestroyed={onSurfaceDestroyed} />}
            {(!view.ready || !view.hasFrame) && <Image pointerEvents="none"
              source={require('../assets/images/six-step-poster.jpg')} style={styles.poster} />}
            {(timed || phase === 'complete') && <View pointerEvents="none"
              style={[styles.cue, phase === 'complete' && styles.completeCue]}>
              <Text style={styles.cueTitle}>{phase === 'complete' ? 'A little progress.' : phase === 'countdown' ? 'Get ready' : 'Your turn'}</Text>
              <Text style={styles.cueNumber}>{phase === 'complete' ? '9 / 9' : Math.ceil(view.remainingMs / 1000)}</Text>
              <Text style={styles.cueHelp}>{phase === 'complete' ? 'See you tomorrow.' : view.running
                ? phase === 'countdown' ? 'Make room for the whole movement.' : 'Try the movement from memory.'
                : 'Paused. Your time is yours.'}</Text>
            </View>}
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.sectionName}>{clip.title}</Text>
            <Text style={styles.time}>{timed ? `${phase === 'countdown' ? 'Get ready' : 'Your turn'}  ${clock(view.remainingMs / 1000)}`
              : `${clock(mediaTime(elapsed, progress.speed))} / ${clock(total)}`}</Text>
          </View>
          <View style={styles.track}><View style={[styles.fill, {width: `${timed
            ? 100 * (1 - view.remainingMs / (phase === 'countdown' ? countdownMs : total * 1000))
            : 100 * elapsed / (clip.end - clip.start)}%`}]} /></View>
        </View>
        <View style={styles.rail}>
          <Text style={styles.lessonTitle}>Six-step{'\n'}foundations</Text>
          <Text style={styles.teacher}>With {lesson.teacher}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.status}>{status}</Text>
          </View>
          <PracticeButton id="play" label={primaryLabel} action={toggle} primary focused={view.focus === 'play'}
            onFocus={() => {update({focus: 'play'}); log('focus', {id: 'play'});}} />
          <PracticeButton id="again" label="Watch again" action={() => watchAgain()} focused={view.focus === 'again'}
            onFocus={() => {update({focus: 'again'}); log('focus', {id: 'again'});}} />
          <PracticeButton id="speed" label={`Speed   ${progress.speed === 1 ? '1×' : '0.75×'}`} action={changeSpeed}
            focused={view.focus === 'speed'} onFocus={() => {update({focus: 'speed'}); log('focus', {id: 'speed'});}} />
        </View>
      </View>
      <View style={styles.sections}>
        {lesson.clips.map((section, index) => <Pressable key={section.title} onPress={() => watchAgain(index)}
          onFocus={() => {update({focus: `clip-${index}`}); log('focus', {id: `clip-${index}`});}}
          accessibilityRole="button" accessibilityLabel={`Section ${index + 1}: ${section.title}. ${progress.rounds[index]} rounds complete.`}
          style={[styles.section, progress.clip === index && styles.selectedSection, view.focus === `clip-${index}` && styles.focused]}>
          <Text style={[styles.sectionNumber, view.focus === `clip-${index}` && styles.focusText]}>{index + 1}</Text>
          <Text style={[styles.sectionLabel, view.focus === `clip-${index}` && styles.focusText]}>{section.title}</Text>
          <Text style={[styles.rounds, view.focus === `clip-${index}` && styles.focusText]}>{progress.rounds[index]}/3</Text>
        </Pressable>)}
      </View>
      <View style={styles.footer}>
        <Text style={styles.help}>{view.saveError ? 'Saving paused. Keep this practice open.' : 'Progress stays on this TV. Back pauses your practice.'}</Text>
        <Text style={styles.credit}>Video: Neil Sweeney · CC BY 3.0 · silent sample</Text>
      </View>
    </View>
  </View>;
};

const styles = StyleSheet.create({
  screen: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.floor},
  canvas: {width: 1280, height: 720, paddingHorizontal: 48, paddingTop: 28, backgroundColor: colors.floor},
  header: {height: 70, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  brand: {fontFamily: 'Barlow Condensed', fontSize: 43, color: colors.ink},
  tagline: {fontFamily: 'Atkinson Hyperlegible', fontSize: 23, color: colors.muted, marginTop: 16},
  body: {flexDirection: 'row', gap: 36},
  stageColumn: {width: 744},
  videoFrame: {width: 744, height: 418.5, backgroundColor: colors.ink, overflow: 'hidden'},
  poster: {position: 'absolute', width: 744, height: 418.5, zIndex: 1},
  video: {width: 744, height: 418.5, zIndex: 0},
  cue: {...StyleSheet.absoluteFillObject, zIndex: 5, backgroundColor: colors.apricot, alignItems: 'center', justifyContent: 'center'},
  completeCue: {backgroundColor: colors.sage},
  cueTitle: {fontFamily: 'Barlow Condensed', fontSize: 60, color: colors.ink},
  cueNumber: {fontFamily: 'Barlow Condensed', fontSize: 176, lineHeight: 180, color: colors.ink},
  cueHelp: {fontFamily: 'Atkinson Hyperlegible', fontSize: 27, color: colors.ink, marginTop: 12},
  progressRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 10},
  sectionName: {fontFamily: 'Atkinson Hyperlegible', fontSize: 23, color: colors.ink},
  time: {fontFamily: 'Atkinson Hyperlegible', fontSize: 22, color: colors.muted},
  track: {height: 5, backgroundColor: colors.soft, borderRadius: 3},
  fill: {height: 5, backgroundColor: colors.focus, borderRadius: 3},
  rail: {width: 404, paddingLeft: 0},
  lessonTitle: {fontFamily: 'Barlow Condensed', fontSize: 56, lineHeight: 56, color: colors.ink},
  teacher: {fontFamily: 'Atkinson Hyperlegible', fontSize: 23, color: colors.muted, marginTop: 10},
  statusRow: {height: 82, marginTop: 24, justifyContent: 'flex-start'},
  status: {fontFamily: 'Atkinson Hyperlegible', fontSize: 24, lineHeight: 29, color: colors.ink},
  button: {minHeight: 62, backgroundColor: colors.paper, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', marginBottom: 10, borderWidth: 3, borderColor: 'transparent'},
  primary: {backgroundColor: colors.ink},
  focused: {backgroundColor: colors.focus, borderColor: colors.paper},
  buttonText: {fontFamily: 'Atkinson Hyperlegible', fontSize: 27, color: colors.ink},
  focusText: {color: colors.paper},
  sections: {flexDirection: 'row', gap: 14, marginTop: 25},
  section: {flex: 1, height: 69, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 3, borderColor: 'transparent', paddingHorizontal: 18},
  selectedSection: {backgroundColor: colors.paper},
  sectionNumber: {fontFamily: 'Barlow Condensed', fontSize: 40, color: colors.focus, width: 40},
  sectionLabel: {flex: 1, fontFamily: 'Atkinson Hyperlegible', fontSize: 25, color: colors.ink},
  rounds: {fontFamily: 'Atkinson Hyperlegible', fontSize: 20, color: colors.muted, marginLeft: 6},
  footer: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 16},
  help: {fontFamily: 'Atkinson Hyperlegible', fontSize: 19, color: colors.muted},
  credit: {fontFamily: 'Atkinson Hyperlegible', fontSize: 17, color: colors.muted, marginTop: 2},
});

export default App;
