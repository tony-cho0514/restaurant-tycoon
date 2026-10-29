import { useEffect, useRef, useState } from 'react';

/** 값이 바뀌면 0.6초 동안 숫자가 따라 올라가거나 내려간다. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value || typeof requestAnimationFrame !== 'function') {
      fromRef.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const frame = (t: number) => {
      const k = Math.min(1, (t - start) / 600);
      const v = from + (value - from) * (1 - Math.pow(1 - k, 3));
      fromRef.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{format(shown)}</>;
}
