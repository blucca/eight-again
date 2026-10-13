import React, {useRef, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {useTVEventHandler} from '@amazon-devices/react-native-kepler';
import {VideoPlayer, KeplerVideoSurfaceView} from '@amazon-devices/react-native-w3cmedia';
import {lesson, Speed, mediaTime, contentTime, sourceFor, clampToClip, clock} from './lesson';

const colors = {
  floor: '#DCD7ED', ink: '#2B2C50', paper: '#FBF8FF', focus: '#6E4DD5',
  soft: '#BBB2D0', muted: '#585571', apricot: '#F5A97A', sage: '#90BFAE',
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
  const [clipIndex, setClipIndex] = useState(0);
  const [speed, setSpeed] = useState<Speed>(0.75);
  const [position, setPosition] = useState(lesson.clips[0].start);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [focus, setFocus] = useState('play');
  const playerRef = useRef<VideoPlayer | null>(null);
  const state = useRef({clip: 0, speed: 0.75 as Speed, target: 29, playAfterSeek: false, initialized: false});
  const lastLog = useRef(0);
  const clip = lesson.clips[clipIndex];

  function log(event: string, detail: object = {}) {
    const p = playerRef.current;
    console.log('[EightAgain] ' + JSON.stringify({
      event, wallMs: Date.now(), mediaTime: p?.currentTime,
      contentTime: p ? contentTime(p.currentTime, state.current.speed) : undefined,
      speed: state.current.speed, clip: state.current.clip,
      paused: p?.paused, seeking: p?.seeking, ...detail,
    }));
  }

  function fail(problem: unknown) {
    state.current.playAfterSeek = false;
    setPlaying(false);
    setBusy(false);
    setError('Video stopped. Select Play to reload this lesson.');
    log('error', {detail: String(problem)});
  }

  function play() {
    const p = playerRef.current;
    if (p) p.play().catch(fail);
  }

  function seekTo(target: number, resume: boolean) {
    const p = playerRef.current;
    if (!p || !state.current.initialized) return;
    const currentClip = lesson.clips[state.current.clip];
    state.current.target = clampToClip(target, currentClip);
    state.current.playAfterSeek = resume;
    setFinished(false);
    if (Math.abs(contentTime(p.currentTime, state.current.speed) - state.current.target) < 0.08) {
      if (resume) play();
      return;
    }
    setBusy(true);
    p.currentTime = mediaTime(state.current.target, state.current.speed);
    log('seek-request', {target: state.current.target});
  }

  function toggle() {
    const p = playerRef.current;
    if (!p || !state.current.initialized) return;
    if (error) {
      setError('');
      setBusy(true);
      state.current.playAfterSeek = true;
      p.src = sourceFor(state.current.speed);
    } else if (busy) {
      return;
    } else if (!p.paused) {
      state.current.playAfterSeek = false;
      p.pause();
    } else if (contentTime(p.currentTime, state.current.speed) >= lesson.clips[state.current.clip].end - 0.1) {
      seekTo(lesson.clips[state.current.clip].start, true);
    } else {
      state.current.playAfterSeek = true;
      play();
    }
  }

  function chooseClip(index: number) {
    state.current.clip = index;
    setClipIndex(index);
    seekTo(lesson.clips[index].start, true);
    log('choose-clip');
  }

  function changeSpeed() {
    const p = playerRef.current;
    if (!p || !state.current.initialized || busy) return;
    const next = state.current.speed === 0.75 ? 1 : 0.75;
    state.current.target = clampToClip(contentTime(p.currentTime, state.current.speed), lesson.clips[state.current.clip]);
    state.current.playAfterSeek = !p.paused;
    p.pause();
    state.current.speed = next;
    setSpeed(next);
    setBusy(true);
    setReady(false);
    p.src = sourceFor(next);
    log('change-speed', {target: state.current.target});
  }

  useTVEventHandler(event => {
    if (event.eventKeyAction !== 0) return;
    log('remote', {key: event.eventType});
    if (event.eventType === 'playpause' || event.eventType === 'playPause') toggle();
    if (event.eventType === 'rewind' || event.eventType === 'skip_backward') {
      const p = playerRef.current;
      if (p && !busy) seekTo(contentTime(p.currentTime, state.current.speed) - 3, !p.paused);
    }
    if (event.eventType === 'fastforward' || event.eventType === 'skip_forward') {
      const p = playerRef.current;
      if (p && !busy) seekTo(contentTime(p.currentTime, state.current.speed) + 3, !p.paused);
    }
  });

  async function onSurfaceCreated(handle: string) {
    try {
      const p = new VideoPlayer();
      playerRef.current = p;
      await p.initialize();
      p.setSurfaceHandle(handle);
      state.current.initialized = true;
      p.addEventListener('loadedmetadata', () => {
        log('loadedmetadata', {duration: p.duration, src: p.src});
        p.currentTime = mediaTime(state.current.target, state.current.speed);
      });
      p.addEventListener('seeked', () => {
        setBusy(false);
        setReady(true);
        setPosition(contentTime(p.currentTime, state.current.speed));
        log('seeked', {target: state.current.target});
        if (state.current.playAfterSeek) play();
      });
      p.addEventListener('playing', () => {setPlaying(true); setBusy(false); setReady(true); log('playing');});
      p.addEventListener('pause', () => {setPlaying(false); log('pause');});
      p.addEventListener('waiting', () => {setBusy(true); log('waiting');});
      p.addEventListener('error', () => fail(p.error?.message || 'Native media error'));
      p.addEventListener('timeupdate', () => {
        const value = contentTime(p.currentTime, state.current.speed);
        setPosition(value);
        if (Date.now() - lastLog.current > 900) {lastLog.current = Date.now(); log('timeupdate');}
        if (!p.seeking && !p.paused && value >= lesson.clips[state.current.clip].end) {
          state.current.playAfterSeek = false;
          p.pause();
          setFinished(true);
          log('section-complete');
        }
      });
      p.autoplay = false;
      p.src = sourceFor(state.current.speed);
      log('surface-created');
    } catch (problem) {fail(problem);}
  }

  async function onSurfaceDestroyed(handle: string) {
    const p = playerRef.current;
    playerRef.current = null;
    state.current.initialized = false;
    if (p) {
      p.clearSurfaceHandle(handle);
      await p.deinitialize();
    }
  }

  const elapsed = Math.max(0, Math.min(clip.end - clip.start, position - clip.start));
  const total = mediaTime(clip.end - clip.start, speed);
  const status = error || (busy ? 'Getting the step ready…' : playing ? 'Watch the whole movement.' : finished ? 'Your turn. Replay when you’re ready.' : 'Take your place. Start when you’re ready.');

  return (
    <View style={styles.screen}>
      <View style={[styles.canvas, {transform: [{scale: Math.min(width / 1280, height / 720)}]}]}>
        <View style={styles.header}>
          <Text style={styles.brand}>Eight Again</Text>
          <Text style={styles.tagline}>A little practice. A little progress.</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.stageColumn}>
            <View style={styles.videoFrame}>
              {!ready && <Image source={require('../assets/images/six-step-poster.jpg')} style={styles.poster} />}
              <KeplerVideoSurfaceView style={styles.video} scalingmode="fit"
                onSurfaceViewCreated={onSurfaceCreated} onSurfaceViewDestroyed={onSurfaceDestroyed} />
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.sectionName}>{clip.title}</Text>
              <Text style={styles.time}>{clock(mediaTime(elapsed, speed))} / {clock(total)}</Text>
            </View>
            <View style={styles.track}><View style={[styles.fill, {width: `${100 * elapsed / (clip.end - clip.start)}%`}]} /></View>
          </View>
          <View style={styles.rail}>
            <Text style={styles.lessonTitle}>Six-step{ '\n' }foundations</Text>
            <Text style={styles.teacher}>With {lesson.teacher}</Text>
            <Text style={styles.status}>{status}</Text>
            <PracticeButton id="play" label={playing ? 'Pause' : 'Play this section'} action={toggle} primary
              focused={focus === 'play'} onFocus={() => {setFocus('play'); log('focus', {id: 'play'});}} />
            <PracticeButton id="again" label="From the top" action={() => seekTo(lesson.clips[state.current.clip].start, true)}
              focused={focus === 'again'} onFocus={() => {setFocus('again'); log('focus', {id: 'again'});}} />
            <PracticeButton id="speed" label={`Speed   ${speed === 1 ? '1×' : '0.75×'}`} action={changeSpeed}
              focused={focus === 'speed'} onFocus={() => {setFocus('speed'); log('focus', {id: 'speed'});}} />
          </View>
        </View>
        <View style={styles.sections}>
          {lesson.clips.map((section, index) => (
            <Pressable key={section.title} onPress={() => chooseClip(index)}
              onFocus={() => {setFocus(`clip-${index}`); log('focus', {id: `clip-${index}`});}}
              accessibilityRole="button" accessibilityLabel={`Section ${index + 1}: ${section.title}`}
              style={[styles.section, clipIndex === index && styles.selectedSection, focus === `clip-${index}` && styles.focused]}>
              <Text style={[styles.sectionNumber, focus === `clip-${index}` && styles.focusText]}>{index + 1}</Text>
              <Text style={[styles.sectionLabel, focus === `clip-${index}` && styles.focusText]}>{section.title}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.footer}>
          <Text style={styles.help}>Use the ring to choose. Press the centre to play.</Text>
          <Text style={styles.credit}>Video: Neil Sweeney · CC BY 3.0 · silent sample</Text>
        </View>
      </View>
    </View>
  );
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
  poster: {position: 'absolute', width: 744, height: 418.5},
  video: {width: 744, height: 418.5},
  progressRow: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 10},
  sectionName: {fontFamily: 'Atkinson Hyperlegible', fontSize: 23, color: colors.ink},
  time: {fontFamily: 'Atkinson Hyperlegible', fontSize: 22, color: colors.muted},
  track: {height: 5, backgroundColor: colors.soft, borderRadius: 3},
  fill: {height: 5, backgroundColor: colors.focus, borderRadius: 3},
  rail: {width: 404, paddingLeft: 0},
  lessonTitle: {fontFamily: 'Barlow Condensed', fontSize: 56, lineHeight: 56, color: colors.ink},
  teacher: {fontFamily: 'Atkinson Hyperlegible', fontSize: 23, color: colors.muted, marginTop: 10},
  status: {fontFamily: 'Atkinson Hyperlegible', fontSize: 24, lineHeight: 29, color: colors.ink, height: 82, marginTop: 24},
  button: {minHeight: 62, backgroundColor: colors.paper, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', marginBottom: 10, borderWidth: 3, borderColor: 'transparent'},
  primary: {backgroundColor: colors.ink},
  focused: {backgroundColor: colors.focus, borderColor: colors.paper},
  buttonText: {fontFamily: 'Atkinson Hyperlegible', fontSize: 27, color: colors.ink},
  focusText: {color: colors.paper},
  sections: {flexDirection: 'row', gap: 14, marginTop: 25},
  section: {flex: 1, height: 69, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 3, borderColor: 'transparent', paddingHorizontal: 18},
  selectedSection: {backgroundColor: colors.paper},
  sectionNumber: {fontFamily: 'Barlow Condensed', fontSize: 40, color: colors.focus, width: 40},
  sectionLabel: {fontFamily: 'Atkinson Hyperlegible', fontSize: 25, color: colors.ink},
  footer: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 16},
  help: {fontFamily: 'Atkinson Hyperlegible', fontSize: 19, color: colors.muted},
  credit: {fontFamily: 'Atkinson Hyperlegible', fontSize: 17, color: colors.muted, marginTop: 2},
});

export default App;
