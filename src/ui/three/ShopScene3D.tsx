import { useEffect, useRef, useState } from 'react';
import type { AnimEvents } from '../../sim/tick';
import { ShopEngine } from './engine';

/** 3D 미니어처 가게. 손가락으로 끌면 돌려 보고, 두 손가락으로 확대할 수 있다. */
export default function ShopScene3D({ anim, hour, still, onFail }: {
  anim: AnimEvents | null;
  hour: number;
  still: boolean;
  onFail: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const engine = useRef<ShopEngine | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let e: ShopEngine;
    try {
      e = new ShopEngine(ref.current!, import.meta.env.BASE_URL, still);
    } catch {
      onFail();
      return;
    }
    engine.current = e;
    e.setHour(hour);
    e.load().then(() => setLoading(false)).catch(() => onFail());
    return () => {
      e.dispose();
      engine.current = null;
    };
    // 엔진은 한 번만 만든다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (anim) engine.current?.play(anim);
  }, [anim]);

  useEffect(() => {
    engine.current?.setHour(hour);
  }, [hour]);

  return (
    <div className="scene3d" ref={ref}>
      {loading && <div className="scene3d-loading">🍕 가게를 꾸미는 중…</div>}
    </div>
  );
}
