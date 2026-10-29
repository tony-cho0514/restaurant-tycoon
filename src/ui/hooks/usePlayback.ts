import { useCallback, useEffect, useRef, useState } from 'react';
import { playTick, type AnimEvents, type PauseReason } from '../../sim/tick';
import type { GameState } from '../../sim/types';

/** 기본 재생 속도: 1주(77틱) = 150초 */
export const MS_PER_TICK = 1948;
export type Speed = 1 | 2 | 4;

export function usePlayback(initial: GameState, o: { now: () => number; persist: (s: GameState) => void }) {
  const [state, setState] = useState(initial);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [pauses, setPauses] = useState<PauseReason[]>([]);
  const [lastAnim, setLastAnim] = useState<AnimEvents | null>(null);

  const stateRef = useRef(state);
  const pausesRef = useRef<PauseReason[]>([]);
  const autoPausedRef = useRef(false);
  const optsRef = useRef(o);
  optsRef.current = o;

  const pushPauses = useCallback((more: PauseReason[]) => {
    pausesRef.current = [...pausesRef.current, ...more];
    setPauses(pausesRef.current);
  }, []);

  const step = useCallback(() => {
    const r = playTick(stateRef.current, optsRef.current.now());
    if (!r) {
      setPlaying(false);
      autoPausedRef.current = false;
      pushPauses([{ kind: 'outOfCharge' }]);
      return;
    }
    stateRef.current = r.state;
    setState(r.state);
    setLastAnim(r.anim);
    optsRef.current.persist(r.state);
    if (r.pauses.length > 0) {
      setPlaying(false);
      autoPausedRef.current = true;
      pushPauses(r.pauses);
    }
  }, [pushPauses]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(step, MS_PER_TICK / speed);
    return () => clearInterval(id);
  }, [playing, speed, step]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setPlaying(false);
        optsRef.current.persist(stateRef.current);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const play = useCallback(() => {
    autoPausedRef.current = false;
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    autoPausedRef.current = false;
    setPlaying(false);
  }, []);

  const dismissPause = useCallback(() => {
    const next = pausesRef.current.slice(1);
    pausesRef.current = next;
    setPauses(next);
    if (next.length === 0 && autoPausedRef.current) {
      autoPausedRef.current = false;
      setPlaying(true);
    }
  }, []);

  const update = useCallback((fn: (s: GameState) => GameState) => {
    const s = fn(stateRef.current);
    stateRef.current = s;
    setState(s);
    optsRef.current.persist(s);
  }, []);

  const replace = useCallback((s: GameState) => {
    stateRef.current = s;
    setState(s);
    setPlaying(false);
    pausesRef.current = [];
    setPauses([]);
    optsRef.current.persist(s);
  }, []);

  return { state, playing, speed, setSpeed, play, stop, lastAnim, pauses, dismissPause, update, replace };
}
