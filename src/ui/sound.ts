// 효과음 네 가지: 판매, 자동 멈춤, 새 카드·새 탭, 한 주 마감. 작게, 끌 수 있게, 알림음은 없다.
// 소리 파일은 public/sounds/에 둔다(무료 공개 소재). 파일이 없으면 조용히 넘어간다.
export type Cue = 'sale' | 'pause' | 'card' | 'week';
export const CUES: Cue[] = ['sale', 'pause', 'card', 'week'];

const SOUND_KEY = 'rt-sound';
const VOLUME = 0.3;

let ctx: AudioContext | null = null;
const buffers = new Map<Cue, AudioBuffer | null>();

export function soundOn(): boolean {
  try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
}

export function setSoundOn(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch { /* 저장이 막히면 이번에만 */ }
}

async function load(cue: Cue) {
  if (!ctx || buffers.has(cue)) return;
  buffers.set(cue, null);
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}sounds/${cue}.mp3`);
    if (!res.ok) return;
    buffers.set(cue, await ctx.decodeAudioData(await res.arrayBuffer()));
  } catch { /* 파일이 없거나 못 읽으면 소리 없이 */ }
}

/** 아이패드는 사용자가 한 번 누른 뒤에만 소리를 낼 수 있다: 첫 터치 때 부른다. */
export function unlockAudio() {
  const AC = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    for (const c of CUES) void load(c);
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
}

export function play(cue: Cue) {
  if (!ctx || !soundOn()) return;
  const buf = buffers.get(cue);
  if (!buf) return;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = VOLUME;
  src.buffer = buf;
  src.connect(gain).connect(ctx.destination);
  src.start();
}
