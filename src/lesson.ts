export const lesson = {
  title: 'Six-step foundations',
  teacher: 'Neil Sweeney',
  source: 'https://commons.wikimedia.org/wiki/File:Tutorial_breakdance_-_Six_Step.webm',
  license: 'CC BY 3.0',
  clips: [
    {title: 'Walk the steps', start: 29, end: 37},
    {title: 'See from above', start: 48, end: 60},
    {title: 'Put it together', start: 79, end: 92},
  ],
};

export type Speed = 1 | 0.75;

// Vega URL mode plays each prepared variant at its native rate.
// Keep lesson positions in the teacher's original timeline.
export const mediaTime = (content: number, speed: Speed) => content / speed;
export const contentTime = (media: number, speed: Speed) => media * speed;
export const sourceFor = (speed: Speed) =>
  `/pkg/assets/raw/six-step-${speed === 1 ? '100' : '075'}.mp4`;

export function clampToClip(position: number, clip: {start: number; end: number}) {
  return Math.max(clip.start, Math.min(clip.end, position));
}

export function clock(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
