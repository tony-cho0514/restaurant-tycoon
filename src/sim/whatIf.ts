// 지난달 다시 돌려 보기: 그 달 첫날 상태에서 설정 하나만 바꿔 한 달을 다시 돌리고, 바꾸지 않은 것과 견준다.
// 장사 계산이 같은 입력이면 같은 결과라 가능하다. 실제 진행은 바뀌지 않는다.
// 두 번 다 「그 달 첫날 설정 그대로」 돌리므로, 달 중간에 바꾼 것은 들어가지 않는다(실제 이익과 조금 다를 수 있다).
import { profitOf } from './ledger';
import { advanceTickInPlace } from './tick';
import { DAYS_PER_MONTH } from './time';
import type { GameState } from './types';

export type WhatIfId = 'price+10' | 'price-10' | 'ads' | 'sunday' | 'late' | 'cheese';

export interface WhatIfOption { id: WhatIfId; label: string; apply: (s: GameState) => void }

const scalePrices = (k: number) => (s: GameState) => {
  for (const id of Object.keys(s.menuPrices) as (keyof GameState['menuPrices'])[]) s.menuPrices[id] = Math.max(1000, Math.round((s.menuPrices[id] * k) / 100) * 100);
};

/** 그 달 첫날 상태에 맞는 「만약」 목록 */
export function whatIfOptions(start: GameState): WhatIfOption[] {
  const ads = start.levers.appAds;
  const sunday = start.settings.closedDay === 6;
  const late = start.settings.closeHour >= 24;
  return [
    { id: 'price+10', label: '피자값을 10% 올렸다면', apply: scalePrices(1.1) },
    { id: 'price-10', label: '피자값을 10% 내렸다면', apply: scalePrices(0.9) },
    { id: 'ads', label: ads ? '배달앱 광고를 껐다면' : '배달앱 광고를 켰다면', apply: (s) => { s.levers = { ...s.levers, appAds: !ads }; } },
    { id: 'sunday', label: sunday ? '일요일에도 열었다면' : '일요일마다 쉬었다면', apply: (s) => { s.settings = { ...s.settings, closedDay: sunday ? null : 6 }; } },
    { id: 'late', label: late ? '밤 10시에 닫았다면' : '자정까지 열었다면', apply: (s) => { s.settings = { ...s.settings, closeHour: late ? 22 : 24 }; } },
    {
      id: 'cheese', label: '치즈를 1주치 더 넉넉히 사 뒀다면',
      apply: (s) => { s.rules = { ...s.rules, mozzarella: { reorderDays: s.rules.mozzarella.reorderDays + 3, targetDays: s.rules.mozzarella.targetDays + 7 } }; },
    },
  ];
}

export interface MonthRun { profit: number; orders: number; revenue: number }

/** 그 달 첫날 상태에서 한 달을 돌린다(바꿀 것이 있으면 먼저 바꾼다) */
export function replayMonth(start: GameState, change?: (s: GameState) => void): MonthRun {
  const s = structuredClone(start);
  change?.(s);
  const monthIndex = Math.floor(start.clock.day / DAYS_PER_MONTH);
  const end = (monthIndex + 1) * DAYS_PER_MONTH;
  while (s.clock.day < end && !s.closed) advanceTickInPlace(s);
  const m = s.ledger.months.find((x) => x.monthIndex === monthIndex);
  if (!m) return { profit: 0, orders: 0, revenue: 0 };
  return { profit: Math.round(profitOf(m)), orders: m.hallOrders + m.deliveryOrders + m.groupOrders, revenue: Math.round(m.revenueHall + m.revenueDelivery) };
}

export function whatIf(start: GameState, id: WhatIfId): { base: MonthRun; changed: MonthRun } {
  const opt = whatIfOptions(start).find((o) => o.id === id)!;
  return { base: replayMonth(start), changed: replayMonth(start, opt.apply) };
}

/** 달이 바뀌어 아직 문을 열기 전인 상태면 그 달 첫날 사진(메시지 글은 빼서 가볍게) */
export function monthStartSnapshot(s: GameState): GameState | null {
  if (s.clock.day % DAYS_PER_MONTH !== 0 || s.openedDay === s.clock.day) return null;
  return { ...structuredClone(s), messages: { ...structuredClone(s.messages), items: [] } };
}
