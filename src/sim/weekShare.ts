// 주간 결과 공유 문구: Wordle처럼 금액·순위 없이 요일별 흑자·적자 칸만. 카톡에 붙여넣는 용도.
import { CARDS, CARD_IDS } from '../content/dexCards';
import { profitOf } from './ledger';
import { NEIGHBORHOODS } from './neighborhoods';
import type { GameState } from './types';

/** 다 끝난 마지막 주(0부터). 아직 한 주도 안 끝났으면 null */
export function lastFullWeek(s: GameState): number | null {
  const w = Math.floor(s.clock.day / 7) - 1;
  return w >= 0 ? w : null;
}

/** 요일별 칸: 흑자 🟩, 적자 🟥, 쉰 날(주문 없음) ⬜ */
export function weekSquares(s: GameState, week: number): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = s.ledger.days.find((x) => x.day === week * 7 + i);
    if (!d || d.hallOrders + d.deliveryOrders + d.groupOrders === 0) return '⬜';
    return profitOf(d) >= 0 ? '🟩' : '🟥';
  });
}

function weekProfit(s: GameState, week: number): number | null {
  const days = s.ledger.days.filter((x) => x.day >= week * 7 && x.day < week * 7 + 7);
  return days.length === 7 ? days.reduce((a, d) => a + profitOf(d), 0) : null;
}

export function weekShareText(s: GameState, week: number, url: string): string {
  const sq = weekSquares(s, week);
  const cur = weekProfit(s, week);
  const prev = week > 0 ? weekProfit(s, week - 1) : null;
  const trend = cur === null ? '' : prev === null ? (cur >= 0 ? '첫 주 흑자 🎉' : '첫 주 적자 😓') : cur > prev ? '지난주보다 더 벌었어요 📈' : cur < prev ? '지난주보다 덜 벌었어요 📉' : '지난주와 같아요';
  const cards = CARD_IDS.filter((id) => { const d = s.learning.dex[id]; return d && d.day >= week * 7 && d.day < week * 7 + 7; });
  return [
    `🍕 ${s.shopName} · ${NEIGHBORHOODS[s.neighborhoodId].name.split(' ')[0]} · ${week + 1}주차`,
    `월 ${sq.join('')} 일`,
    trend,
    cards.length ? `새 카드 ${cards.map((id) => `${CARDS[id].icon} ${CARDS[id].title}`).join(' · ')}` : '',
    url,
  ].filter(Boolean).join('\n');
}
