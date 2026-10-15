import assert from 'node:assert/strict';
import {lesson, mediaTime, contentTime, sourceFor, clampToClip, clock, localDay, restoreProgress, finishRound, isComplete, tickRemaining, cueForPhase, cueIsCurrent} from './lesson.ts';

for (const clip of lesson.clips) {
  assert(clip.start >= 0 && clip.end > clip.start && clip.end < 106.507);
  for (const speed of [1, 0.75] as const) {
    assert.equal(contentTime(mediaTime(clip.start, speed), speed), clip.start);
    assert(Math.abs((mediaTime(clip.end, speed) - mediaTime(clip.start, speed)) * speed - (clip.end - clip.start)) < 1e-8);
  }
  assert.equal(clampToClip(-5, clip), clip.start);
  assert.equal(clampToClip(999, clip), clip.end);
}
assert.equal(sourceFor(0.75), '/pkg/assets/raw/six-step-075.mp4');
assert.equal(sourceFor(1), '/pkg/assets/raw/six-step-100.mp4');
assert.equal(clock(10.67), '0:11');
assert.equal(clock(-1), '0:00');
let progress = restoreProgress(null);
for (let round = 0; round < 9; round++) {
  assert.equal(progress.clip, Math.floor(round / 3));
  assert.equal(isComplete(progress), false);
  progress = finishRound(progress);
}
assert.equal(isComplete(progress), true);
assert.deepEqual(progress.rounds, [3, 3, 3]);
assert.deepEqual(restoreProgress(progress), progress);
assert.deepEqual(restoreProgress({...progress, day: '2000-01-01'}).rounds, [0, 0, 0]);
assert.equal(restoreProgress({...progress, day: '2000-01-01'}).clip, 2);
assert.deepEqual(finishRound({...progress, day: '2000-01-01'}).rounds, [0, 0, 1]);
assert.deepEqual(restoreProgress({day: localDay(), clip: 9, speed: 4, rounds: [-1, 4, null]}),
  {day: localDay(), clip: 0, speed: 0.75, rounds: [0, 0, 0]});
assert.equal(tickRemaining(5000, 1200, true), 3800);
assert.equal(tickRemaining(5000, 1200, false), 5000);
assert.equal(tickRemaining(5000, 9000, true), 0);
assert.equal(tickRemaining(5000, -500, true), 5000);
assert.equal(cueForPhase('countdown'), 'ready');
assert.equal(cueIsCurrent('ready', 'countdown', true, true), true);
assert.equal(cueIsCurrent('ready', 'practice', true, true), false);
assert.equal(cueIsCurrent('practice', 'practice', false, true), false);
assert.equal(cueIsCurrent('watch', 'watch', true, false), false);
assert.equal(cueIsCurrent('complete', 'complete', false, true), true);
assert.equal(cueIsCurrent('complete', 'complete', false, false), false);
console.log('Lesson timeline, practice, saved progress, paused clock and voice-cue gate pass.');
