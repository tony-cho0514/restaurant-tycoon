import { Suspense, lazy, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Cycle, Weather } from '../../sim/economy';
import type { ActiveShock } from '../../sim/news';
import type { AnimEvents } from '../../sim/tick';
import { won } from '../format';
import { CUSTOMER_ICONS, PIZZA_ICON, RIDER_ICON } from '../icons';
import { SCENE_ASSETS, SCENE_LAYOUT } from '../sceneLayout';
import { canUse3D } from '../three/support';

// 3D 미니어처는 three.js가 무거워서 필요할 때만 따로 받는다.
const ShopScene3D = lazy(() => import('../three/ShopScene3D'));

export type Mood = 'normal' | 'crisis' | 'opportunity';

export function moodOf(active: ActiveShock[], cycle: Cycle): Mood {
  if (cycle === 'recession' || active.some((a) => a.type === 'CHEESE_SHORTAGE')) return 'crisis';
  if (cycle === 'boom' || active.some((a) => a.type === 'FESTIVAL' || a.type === 'VEG_HARVEST')) return 'opportunity';
  return 'normal';
}

type SpriteKind = 'customer' | 'rider' | 'pizza';
interface Sprite { id: number; kind: SpriteKind; variant: number; still: boolean }
interface Float { id: number; text: string; tone: 'good' | 'bad' }

const MAX_SPRITES = 20;
const LIFETIME: Record<SpriteKind, number> = { customer: 1500, rider: 1700, pizza: 1400 };

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function hourTint(hour: number): string {
  if (hour >= 19) return 'rgba(20, 40, 120, 0.25)';
  if (hour >= 17) return 'rgba(255, 150, 50, 0.12)';
  return 'transparent';
}

function path(from: { x: number; y: number }, to: { x: number; y: number }): CSSProperties {
  return { '--fx': `${from.x}%`, '--fy': `${from.y}%`, '--tx': `${to.x}%`, '--ty': `${to.y}%` } as CSSProperties;
}

export function ShopScene({ anim, hour, weather, mood }: { anim: AnimEvents | null; hour: number; weather: Weather; mood: Mood }) {
  const [sprites, setSprites] = useState<Sprite[]>([]);
  const [floats, setFloats] = useState<Float[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextId = useRef(1);
  const count = useRef(0);
  // 3D를 쓸 수 있으면 3D 미니어처, 아니면(또는 소재를 못 받으면) 그림 문자 가게
  const [mode, setMode] = useState<'3d' | '2d'>(() => (canUse3D() ? '3d' : '2d'));
  const still = prefersReducedMotion();

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!anim) return;
    const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };

    const newFloats: Float[] = [];
    if (anim.revenue > 0) newFloats.push({ id: nextId.current++, text: `+${won(anim.revenue)}`, tone: 'good' });
    if (anim.lostOrders > 0) newFloats.push({ id: nextId.current++, text: `놓친 주문 ${anim.lostOrders}건`, tone: 'bad' });
    if (newFloats.length) {
      setFloats((f) => [...f, ...newFloats]);
      const ids = new Set(newFloats.map((f) => f.id));
      later(1200, () => setFloats((f) => f.filter((x) => !ids.has(x.id))));
    }
    if (mode === '3d') return; // 3D에서는 엔진이 손님·피자·배달을 직접 움직인다.
    // 움직임 줄이기 설정이면 이동 없이 제자리에서 나타났다 사라지게만 한다(그래도 가게가 돌아가는 건 보이게).

    const spawn = (kind: SpriteKind, n: number, gap: number) => {
      for (let i = 0; i < n; i++) {
        later(i * gap, () => {
          if (count.current >= MAX_SPRITES) return;
          const sprite = { id: nextId.current++, kind, variant: Math.floor(Math.random() * 4), still };
          count.current++;
          setSprites((s) => [...s, sprite]);
          later(LIFETIME[kind], () => {
            count.current--;
            setSprites((s) => s.filter((x) => x.id !== sprite.id));
          });
        });
      }
    };
    spawn('customer', Math.min(anim.hallArrivals, 6), 150);
    spawn('rider', Math.min(anim.deliveriesOut, 4), 150);
    spawn('pizza', Math.min(anim.pizzasBaked, 5), 100);
  }, [anim, mode, still]);

  const L = SCENE_LAYOUT;
  return (
    <div className={`scene mood-${mood}`} style={SCENE_ASSETS.background ? { backgroundImage: `url(${SCENE_ASSETS.background})` } : undefined}>
      {mode === '3d' && (
        <Suspense fallback={<div className="scene3d-loading">🍕 가게를 꾸미는 중…</div>}>
          <ShopScene3D anim={anim} hour={hour} still={still} onFail={() => setMode('2d')} />
        </Suspense>
      )}
      {mode === '2d' && !SCENE_ASSETS.background && (
        <div className="scene-placeholder" aria-hidden="true">
          <span className="ph oven" style={{ left: `${L.oven.x}%`, top: `${L.oven.y}%` }}>🔥</span>
          <span className="ph counter" style={{ left: `${L.counter.x}%`, top: `${L.counter.y}%` }}>카운터</span>
          <span className="ph door" style={{ left: `${L.door.x}%`, top: `${L.door.y}%` }}>🚪</span>
          <span className="ph decor" style={{ left: '62%', top: '30%' }}>🖼️</span>
          <span className="ph decor" style={{ left: '76%', top: '28%' }}>🍕</span>
          <span className="ph decor" style={{ left: '94%', top: '52%' }}>🪴</span>
          <span className="ph decor" style={{ left: '58%', top: '74%' }}>🪑</span>
          <span className="ph decor table" style={{ left: '66%', top: '78%' }}>🍽️</span>
          <span className="ph decor" style={{ left: '74%', top: '74%' }}>🪑</span>
          <span className="ph sign" style={{ left: '50%', top: '10%' }}>🍕 PIZZA 🍕</span>
        </div>
      )}
      {sprites.map((s) => {
        const style =
          s.kind === 'customer' ? path(L.door, L.counter)
          : s.kind === 'rider' ? path(L.kitchen, L.exit)
          : path(L.oven, L.oven);
        const img = s.kind === 'customer' ? SCENE_ASSETS.customers[s.variant % Math.max(1, SCENE_ASSETS.customers.length)]
          : s.kind === 'rider' ? SCENE_ASSETS.rider : SCENE_ASSETS.pizza;
        return (
          <div key={s.id} data-sprite={s.kind} className={`sprite ${s.kind} v${s.variant}${s.still ? ' still' : ''}`} style={style}>
            {img ? <img src={img} alt="" draggable={false} /> : <span className="emoji">{s.kind === 'customer' ? CUSTOMER_ICONS[s.variant % CUSTOMER_ICONS.length] : s.kind === 'rider' ? RIDER_ICON : PIZZA_ICON}</span>}
          </div>
        );
      })}
      {mode === '2d' && <div className="tint" style={{ background: hourTint(hour) }} />}
      <div className={`weather w-${weather}`} />
      <div className="floats">
        {floats.map((f) => <div key={f.id} className={`float ${f.tone}`}>{f.text}</div>)}
      </div>
    </div>
  );
}
