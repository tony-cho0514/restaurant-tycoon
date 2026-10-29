import { accrueCharge, formatCharge } from '../../sim/charge';
import type { Weather } from '../../sim/economy';
import { formatClock } from '../../sim/time';
import type { GameState } from '../../sim/types';
import { won } from '../format';
import type { Speed } from '../hooks/usePlayback';
import { AnimatedNumber } from './AnimatedNumber';

const WEATHER_LABEL: Record<Weather, string> = { sunny: '☀️ 맑음', cloudy: '☁️ 흐림', rain: '🌧️ 비', heat: '🔥 폭염', cold: '❄️ 한파' };
const SPEEDS: Speed[] = [1, 2, 4];

export function PlaybackBar(p: {
  state: GameState;
  now: number;
  playing: boolean;
  speed: Speed;
  onPlay: () => void;
  onStop: () => void;
  onSpeed: (s: Speed) => void;
}) {
  const charge = accrueCharge(p.state.charge, p.now).ticks;
  return (
    <div className="playbar">
      <button
        className="btn primary play"
        aria-label={p.playing ? '멈춤' : '재생'}
        onClick={p.playing ? p.onStop : p.onPlay}
      >
        {p.playing ? '❚❚' : '▶'}
      </button>
      <div className="speeds" role="group" aria-label="재생 속도">
        {SPEEDS.map((s) => (
          <button key={s} className="btn" aria-pressed={p.speed === s} onClick={() => p.onSpeed(s)}>{s}×</button>
        ))}
      </div>
      <div className="playbar-info">
        <div className="clock">{formatClock(p.state.clock)} · {WEATHER_LABEL[p.state.economy.weather]}</div>
        <div className="charge">남은 영업 {formatCharge(charge)}</div>
      </div>
      <div className={`cash ${p.state.cash < 0 ? 'neg' : ''}`}>
        <span className="cash-label">통장</span>
        <AnimatedNumber value={p.state.cash} format={won} />
      </div>
    </div>
  );
}
