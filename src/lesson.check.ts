import assert from 'node:assert/strict';
import {lesson, mediaTime, contentTime, sourceFor, clampToClip, clock} from './lesson.ts';

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
console.log('Lesson positions, prepared speeds, boundaries and display clock pass.');
