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

export const roundsPerSection = 3;
export const countdownMs = 5000;
export const saveKey = 'eight-again:six-step:v1';

export type Progress = {day: string; clip: number; speed: Speed; rounds: number[]};

export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function restoreProgress(value: unknown, day = localDay()): Progress {
  const saved = value && typeof value === 'object' ? value as Partial<Progress> : {};
  const clip = Number.isInteger(saved.clip) && saved.clip! >= 0 && saved.clip! < lesson.clips.length ? saved.clip! : 0;
  const speed = saved.speed === 1 ? 1 : 0.75;
  const rounds = saved.day === day && Array.isArray(saved.rounds) && saved.rounds.length === lesson.clips.length
    ? saved.rounds.map(n => Number.isInteger(n) && n >= 0 && n <= roundsPerSection ? n : 0)
    : lesson.clips.map(() => 0);
  return {day, clip, speed, rounds};
}

export function finishRound(progress: Progress): Progress {
  const rounds = [...progress.rounds];
  rounds[progress.clip] = Math.min(roundsPerSection, rounds[progress.clip] + 1);
  let clip = progress.clip;
  if (rounds[clip] === roundsPerSection) {
    for (let offset = 1; offset < rounds.length; offset++) {
      const candidate = (clip + offset) % rounds.length;
      if (rounds[candidate] < roundsPerSection) {clip = candidate; break;}
    }
  }
  return {...progress, day: localDay(), clip, rounds};
}

export const isComplete = (progress: Progress) => progress.rounds.every(n => n === roundsPerSection);

export function tickRemaining(remaining: number, elapsed: number, running: boolean) {
  return Math.max(0, remaining - (running ? Math.max(0, elapsed) : 0));
}
