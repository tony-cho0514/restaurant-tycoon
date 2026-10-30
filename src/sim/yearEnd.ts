// 1년 결산: 12달을 버티면 한 해를 돌아보고 칭호를 붙인다. 엔딩이 아니라 매듭이다(다음 날부터 2년차, 첫 숙제는 월세 인상).
import { CARD_IDS } from '../content/dexCards';
import { profitOf } from './ledger';
import { monthLabel } from './report';
import type { GameState } from './types';

export const MONTHS_PER_YEAR = 12;

export interface YearReport {
  /** 1부터 */
  year: number;
  revenue: number;
  profit: number;
  lossMonths: number;
  best: { label: string; profit: number } | null;
  worst: { label: string; profit: number } | null;
  /** 겪은 악재(위기·동네 사정) 수 */
  hardships: number;
  burnout: boolean;
  dex: number;
  titles: string[];
}

/** 이 달이 한 해의 마지막 달이면 결산을 만든다 */
export function yearEndReport(s: GameState, monthIndex: number): YearReport | null {
  if ((monthIndex + 1) % MONTHS_PER_YEAR !== 0) return null;
  const year = (monthIndex + 1) / MONTHS_PER_YEAR;
  const from = monthIndex + 1 - MONTHS_PER_YEAR;
  const months = s.ledger.months.filter((m) => m.monthIndex >= from && m.monthIndex <= monthIndex);
  const reports = s.learning.reports.filter((r) => r.monthIndex >= from && r.monthIndex <= monthIndex);
  const revenue = Math.round(months.reduce((a, m) => a + m.revenueHall + m.revenueDelivery, 0));
  const profit = Math.round(months.reduce((a, m) => a + profitOf(m), 0));
  const byProfit = months.map((m) => ({ label: monthLabel(m.monthIndex), profit: Math.round(profitOf(m)) })).sort((a, b) => b.profit - a.profit);
  const lossMonths = byProfit.filter((m) => m.profit < 0).length;
  const badEvents = reports.flatMap((r) => r.events.filter((e) => e.tone === 'bad'));
  const burnout = badEvents.some((e) => e.text.includes('쓰러'));
  const hardships = new Set(badEvents.filter((e) => !e.text.includes('쓰러')).map((e) => `${e.day}:${e.text}`)).size;
  // 악재가 있었던 달에도 흑자를 낸 달 수
  const toughGood = reports.filter((r) => r.profit > 0 && r.events.some((e) => e.tone === 'bad' && !e.text.includes('쓰러'))).length;
  const dex = CARD_IDS.filter((id) => s.learning.dex[id]).length;
  const titles: string[] = [];
  if (lossMonths === 0) titles.push('🏆 한 번도 적자 없는 사장');
  else if (profit > 0) titles.push('💪 꺾였다가 다시 일어난 사장');
  if (toughGood >= 2) titles.push('🛡️ 위기에 강한 사장');
  if (!burnout) titles.push('🛌 쉬는 날을 지킨 사장');
  if (dex >= 15) titles.push('📚 배우는 사장');
  if (titles.length === 0) titles.push('🌱 1년을 버텨 낸 사장');
  return {
    year, revenue, profit, lossMonths,
    best: byProfit[0] ?? null, worst: byProfit.length > 1 ? byProfit[byProfit.length - 1] : null,
    hardships, burnout, dex, titles: titles.slice(0, 3),
  };
}
