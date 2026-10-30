// 동네 사정: 장사가 안 되는 날엔 이유가 있다.
// 아무 때나 오는 일(가게 앞 공사·근처 경쟁 피자집·배달앱 노출 하락)과 해마다 같은 때 오는 일(방학·휴가철·명절·장마).
// 대부분 미리 귀띔이 오고(배달앱 노출 하락은 며칠 뒤 단서만), 해결책은 알려 주지 않는다.
import { messageRng, pushMessage, type Sender } from './messages';
import type { NeighborhoodId } from './neighborhoods';
import type { Rng } from './rng';
import { unlockCard } from './learning';
import type { DayRecord } from './ledger';
import { calendar, type Clock } from './time';
import type { GameState } from './types';

export type LocalType = 'roadwork' | 'competitor' | 'appRank';

export interface LocalEvent {
  id: number;
  type: LocalType;
  /** 귀띔이 오는 날(배달앱 노출 하락은 시작 이틀 뒤 단서) */
  signalDay: number;
  startDay: number;
  endDay: number;
  /** 경쟁 가게: 오픈 할인이 끝나는 날. 그 뒤 endDay까지는 손님 일부를 계속 뺏긴다 */
  discountEnd?: number;
  /** 경쟁 가게 이름 */
  name?: string;
}

export interface LocalState {
  events: LocalEvent[];
  nextId: number;
}

export function initialLocal(): LocalState {
  return { events: [], nextId: 1 };
}

/** 한 주에 동네 사건이 새로 생길 확률(평균 5~6주에 한 번쯤) */
const WEEKLY_LOCAL_CHANCE = 0.3;
const LOCAL_KEEP = 30;
/** 경쟁 가게가 다시 생기려면 지난번 경쟁이 끝나고 이만큼 지나야 한다 */
const COMPETITOR_GAP_DAYS = 56;
/** 할인이 끝난 뒤 손님 일부를 계속 뺏기는 기간 */
const COMPETITOR_SETTLE_DAYS = 28;
const COMPETITOR_NAMES = ['피자왕국', '도우하우스', '빅스타피자', '치즈팩토리', '화덕공방'];

/** 사건이 손님 수에 주는 곱 */
export const LOCAL_DEMAND = {
  roadwork: { hall: 0.6, delivery: 0.95 },
  competitorDiscount: { hall: 0.85, delivery: 0.78 },
  /** 할인이 끝난 뒤: 평점이 높으면 덜 뺏긴다 */
  competitorSettled: 0.94,
  competitorSettledGood: 0.98,
  competitorGoodRating: 4.5,
  appRank: 0.75,
  /** 배달앱 광고를 켜 두면 노출 하락을 상당 부분 메운다 */
  appRankWithAds: 0.92,
  campusVacation: 0.6,
  officeSummerLeave: 0.55,
  holiday: { campus: 0.5, office: 0.3, residential: 1.15 } as Record<NeighborhoodId, number>,
};
/** 장마철 비 오는 날 배달 기사가 모자라 늦어지는 시간(분) */
export const MONSOON_DELIVERY_DELAY = 10;
/** 장마철에 비가 올 확률 */
export const MONSOON_RAIN_CHANCE = 0.55;

// ── 해마다 같은 때 ────────────────────────────────────

const cal = (day: number) => calendar({ day, hour: 0 } as Clock);

type CalKey = 'vacation' | 'summerLeave' | 'seollal' | 'chuseok' | 'monsoon';

interface CalDef {
  key: CalKey;
  label: string;
  /** 귀띔은 시작 며칠 전에 */
  lead: number;
  applies: (n: NeighborhoodId) => boolean;
  active: (day: number) => boolean;
  signal: { from: Sender; name: string; text: string };
  start?: { from: Sender; name: string; text: string };
  end?: { from: Sender; name: string; text: string };
}

const CAL_EVENTS: CalDef[] = [
  {
    key: 'vacation', label: '방학', lead: 5, applies: (n) => n === 'campus',
    active: (d) => [1, 2, 7, 8].includes(cal(d).month),
    signal: { from: 'request', name: '단골 학생', text: '다음 주면 종강이에요~ 다들 고향 내려가요 ㅠ 방학 동안은 자주 못 올 것 같아요' },
    end: { from: 'request', name: '단골 학생', text: '개강했어요! 다시 자주 올게요 🎒' },
  },
  {
    key: 'summerLeave', label: '여름 휴가철', lead: 3, applies: (n) => n === 'office',
    active: (d) => cal(d).month === 8 && cal(d).dayOfMonth < 14,
    signal: { from: 'request', name: '단골 직장인', text: '다음 주부터 회사 사람들 거의 다 휴가 가요 🏖️ 점심 주문은 좀 줄 거예요' },
    end: { from: 'request', name: '단골 직장인', text: '휴가 끝나고 다들 복귀했어요. 오늘 점심 단체로 갈게요!' },
  },
  {
    key: 'seollal', label: '설 연휴', lead: 3, applies: () => true,
    active: (d) => cal(d).month === 2 && cal(d).dayOfMonth >= 9 && cal(d).dayOfMonth <= 11,
    signal: { from: 'news', name: '동네 소식', text: '다음 주 설 연휴예요. 회사·학교는 쉬고, 집집마다 가족이 모여요.' },
  },
  {
    key: 'chuseok', label: '추석 연휴', lead: 3, applies: () => true,
    active: (d) => cal(d).month === 9 && cal(d).dayOfMonth >= 16 && cal(d).dayOfMonth <= 18,
    signal: { from: 'news', name: '동네 소식', text: '다음 주 추석 연휴예요. 회사·학교는 쉬고, 집집마다 가족이 모여요.' },
  },
  {
    key: 'monsoon', label: '장마', lead: 2, applies: () => true,
    active: (d) => cal(d).month === 7 && cal(d).dayOfMonth < 21,
    signal: { from: 'news', name: '일기예보', text: '모레부터 장마가 시작돼요. 3주쯤 비 오는 날이 많겠어요. 비 오는 날엔 배달 기사가 모자라요.' },
    end: { from: 'news', name: '일기예보', text: '장마가 끝났어요. ☀️' },
  },
];

export function calendarActive(n: NeighborhoodId, day: number): CalDef[] {
  return CAL_EVENTS.filter((e) => e.applies(n) && e.active(day));
}

export const inMonsoon = (day: number) => CAL_EVENTS.find((e) => e.key === 'monsoon')!.active(day);

/** 장마철엔 비가 잦다. 그 밖엔 계절대로. */
export function monsoonRain(day: number, rng: Rng): boolean {
  return inMonsoon(day) && rng.chance(MONSOON_RAIN_CHANCE);
}

// ── 손님 수 ──────────────────────────────────────────

const activeOn = (e: LocalEvent, day: number) => day >= e.startDay && day <= e.endDay;

/** 오늘 동네 사정이 손님 수에 주는 곱(홀·배달) */
export function localDemand(s: GameState, day: number): { hall: number; delivery: number } {
  let hall = 1;
  let delivery = 1;
  for (const e of s.local.events) {
    if (!activeOn(e, day)) continue;
    if (e.type === 'roadwork') {
      hall *= LOCAL_DEMAND.roadwork.hall;
      delivery *= LOCAL_DEMAND.roadwork.delivery;
    } else if (e.type === 'competitor') {
      if (day <= e.discountEnd!) {
        hall *= LOCAL_DEMAND.competitorDiscount.hall;
        delivery *= LOCAL_DEMAND.competitorDiscount.delivery;
      } else {
        const avg = (s.ratings.hall + s.ratings.delivery) / 2;
        const f = avg >= LOCAL_DEMAND.competitorGoodRating ? LOCAL_DEMAND.competitorSettledGood : LOCAL_DEMAND.competitorSettled;
        hall *= f;
        delivery *= f;
      }
    } else {
      delivery *= s.levers.appAds ? LOCAL_DEMAND.appRankWithAds : LOCAL_DEMAND.appRank;
    }
  }
  for (const c of calendarActive(s.neighborhoodId, day)) {
    let f = 1;
    if (c.key === 'vacation') f = LOCAL_DEMAND.campusVacation;
    else if (c.key === 'summerLeave') f = LOCAL_DEMAND.officeSummerLeave;
    else if (c.key === 'seollal' || c.key === 'chuseok') f = LOCAL_DEMAND.holiday[s.neighborhoodId];
    hall *= f;
    delivery *= f;
  }
  return { hall, delivery };
}

// ── 새 사건 ──────────────────────────────────────────

/** 월요일 개점 때: 동네에 새 일이 생길지 정한다(같은 종류는 겹치지 않는다). */
/** room: 새 악재가 들어설 여지(0~1, 숨 돌릴 틈). 동네 사정은 모두 악재다. */
export function planLocalWeek(s: GameState, rng: Rng, room = 1): void {
  if (!rng.chance(WEEKLY_LOCAL_CHANCE * room)) return;
  const day = s.clock.day;
  const pendingOrActive = (t: LocalType) => s.local.events.some((e) => e.type === t && e.endDay >= day);
  const lastCompetitor = Math.max(-Infinity, ...s.local.events.filter((e) => e.type === 'competitor').map((e) => e.endDay));
  const opts: { item: LocalType; weight: number }[] = [];
  if (!pendingOrActive('roadwork')) opts.push({ item: 'roadwork', weight: 3 });
  if (!pendingOrActive('competitor') && day - lastCompetitor >= COMPETITOR_GAP_DAYS) opts.push({ item: 'competitor', weight: 2 });
  if (!pendingOrActive('appRank')) opts.push({ item: 'appRank', weight: 3 });
  if (opts.length === 0) return;
  const type = rng.weighted(opts);
  const id = s.local.nextId;
  let e: LocalEvent;
  if (type === 'roadwork') {
    const start = day + rng.int(3, 6);
    e = { id, type, signalDay: day, startDay: start, endDay: start + rng.int(5, 10) - 1 };
  } else if (type === 'competitor') {
    const start = day + 7;
    const discountEnd = start + rng.int(14, 21) - 1;
    e = { id, type, signalDay: day, startDay: start, endDay: discountEnd + COMPETITOR_SETTLE_DAYS, discountEnd, name: rng.pick(COMPETITOR_NAMES) };
  } else {
    const start = day + rng.int(1, 5);
    e = { id, type, signalDay: start + 2, startDay: start, endDay: start + rng.int(6, 9) - 1 };
  }
  s.local = { events: [...s.local.events, e].slice(-LOCAL_KEEP), nextId: id + 1 };
}

const md = (day: number) => `${cal(day).month}/${cal(day).dayOfMonth + 1}`;

/** 개점 때: 오늘 시작·끝나는 일과 귀띔·단서 메시지 */
export function localMorning(s: GameState): void {
  const day = s.clock.day;
  const rng = messageRng(s, 9);
  for (const e of s.local.events) {
    if (e.type === 'roadwork') {
      if (day === e.signalDay) pushMessage(s, { from: 'news', name: '구청 안내문', text: `가게 앞 도로를 ${md(e.startDay)}부터 ${md(e.endDay)}까지 공사한대요. 인도 일부가 막혀요. 🚧`, tone: 'bad', important: true });
      if (day === e.startDay) pushMessage(s, { from: 'owner', name: '사장님(나)', text: '공사 소음에 인도까지 막혔네… 지나가는 사람이 확 줄었다', tone: 'bad' });
      if (day === e.endDay + 1) pushMessage(s, { from: 'owner', name: '사장님(나)', text: '가게 앞 공사가 드디어 끝났다! 🎉', tone: 'good' });
    } else if (e.type === 'competitor') {
      if (day === e.signalDay) pushMessage(s, { from: 'request', name: '단골 손님', text: '사장님, 건너편에 피자집 인테리어 공사 중이던데요? 다음 주에 문 연대요', tone: 'bad', important: true });
      if (day === e.startDay) pushMessage(s, { from: 'news', name: '동네 소식', text: `건너편 「${e.name}」 개업! 오픈 기념 전 메뉴 30% 할인 중이래요`, tone: 'bad', important: true });
      if (day === e.discountEnd! + 1) pushMessage(s, { from: 'request', name: '단골 손님', text: `「${e.name}」 할인 끝났대요. 저는 역시 여기가 좋아요 ㅎㅎ`, tone: 'neutral' });
      if (day === e.endDay + 1) pushMessage(s, { from: 'news', name: '동네 소식', text: `요즘 「${e.name}」 손님이 많이 줄었대요. 동네 피자 손님이 자리를 잡았어요.`, tone: 'good' });
    } else if (day === e.signalDay) {
      const staff = s.staff.filter((x) => !(s.absentToday ?? []).includes(x.id));
      const text = '배달앱에서 우리 가게 검색해도 한참 아래에 떠요 😥 요즘 배달이 왜 이렇게 없나 했어요';
      if (staff.length > 0) pushMessage(s, { from: 'staff', name: rng.pick(staff).name, text: `사장님, ${text}`, tone: 'bad' });
      else pushMessage(s, { from: 'owner', name: '사장님(나)', text: '배달앱에서 우리 가게가 한참 아래에 뜨네… 그래서 배달이 없었구나', tone: 'bad' });
    }
  }
  for (const c of CAL_EVENTS) {
    if (!c.applies(s.neighborhoodId)) continue;
    if (c.active(day + c.lead) && !c.active(day + c.lead - 1)) pushMessage(s, { ...c.signal, tone: c.key === 'monsoon' ? 'neutral' : 'bad', important: true });
    if (c.start && c.active(day) && !c.active(day - 1)) pushMessage(s, { ...c.start, tone: 'neutral' });
    if (c.end && !c.active(day) && c.active(day - 1)) pushMessage(s, { ...c.end, tone: 'good' });
  }
}

// ── 마감 때: 도감 ─────────────────────────────────────

const orders = (d: DayRecord) => d.hallOrders + d.deliveryOrders;
function avgOrders(days: DayRecord[], from: number, to: number): number | null {
  const open = days.filter((d) => d.day >= from && d.day <= to && orders(d) > 0);
  return open.length > 0 ? open.reduce((a, d) => a + orders(d), 0) / open.length : null;
}

/** 해마다 같은 때 줄어든 손님(비수기), 경쟁 가게 할인 동안 줄어든 손님을 겪은 뒤 도감 카드를 연다. */
export function localEvening(s: GameState): void {
  const day = s.clock.day;
  const days = s.ledger.days;
  if (!s.learning.dex.seasonality) {
    for (const c of CAL_EVENTS) {
      if (!c.applies(s.neighborhoodId) || c.key === 'monsoon' || (c.key !== 'vacation' && c.key !== 'summerLeave' && s.neighborhoodId === 'residential')) continue;
      // 시작한 지 일주일 되는 날(연휴처럼 짧으면 끝나는 날)
      let start = day;
      while (c.active(start - 1)) start--;
      if (!c.active(day) || !(day - start === 6 || (!c.active(day + 1) && day - start < 6))) continue;
      const before = avgOrders(days, start - 7, start - 1);
      const during = avgOrders(days, start, day);
      if (before === null || during === null) continue;
      unlockCard(s, 'seasonality', `${c.label}이 되자 하루 주문이 ${before.toFixed(1)}건 → ${during.toFixed(1)}건이 됐어요. 해마다 이맘때 같은 일이 생겨요.`);
      break;
    }
  }
  const comp = s.local.events.find((e) => e.type === 'competitor' && e.discountEnd === day);
  if (comp && !s.learning.dex.competition) {
    const before = avgOrders(days, comp.startDay - 7, comp.startDay - 1);
    const during = avgOrders(days, comp.startDay, day);
    if (before !== null && during !== null) {
      unlockCard(s, 'competition', `건너편 「${comp.name}」이 할인하는 동안 하루 주문이 ${before.toFixed(1)}건 → ${during.toFixed(1)}건이 됐어요.`);
    }
  }
}

// ── 리포트·현황용 ─────────────────────────────────────

const LOCAL_LABEL: Record<LocalType, string> = { roadwork: '가게 앞 도로 공사', competitor: '근처 경쟁 피자집', appRank: '배달앱 노출 하락' };

/** 그달에 있었던 동네 사정(리포트의 「이번 달 있었던 일」) */
export interface LocalMention { day: number; label: string; text: string; tone: 'good' | 'bad' | 'neutral' }

export function localEventsIn(s: GameState, from: number, to: number): LocalMention[] {
  const out: LocalMention[] = [];
  for (const e of s.local.events) {
    if (e.endDay < from || e.startDay > to) continue;
    const label = e.type === 'competitor' ? `${LOCAL_LABEL.competitor} 「${e.name}」(오픈 할인 ~${md(e.discountEnd!)})` : LOCAL_LABEL[e.type];
    out.push({ day: Math.max(from, e.startDay), label: LOCAL_LABEL[e.type], text: `${label} ${md(e.startDay)}~${md(e.endDay)}`, tone: 'bad' });
  }
  for (const c of CAL_EVENTS) {
    if (!c.applies(s.neighborhoodId)) continue;
    let d = from;
    while (d <= to) {
      if (!c.active(d)) { d++; continue; }
      let e = d;
      while (e + 1 <= to && c.active(e + 1)) e++;
      const good = (c.key === 'seollal' || c.key === 'chuseok') && LOCAL_DEMAND.holiday[s.neighborhoodId] > 1;
      out.push({ day: d, label: c.label, text: `${c.label} ${md(d)}~${md(e)}`, tone: c.key === 'monsoon' ? 'neutral' : good ? 'good' : 'bad' });
      d = e + 1;
    }
  }
  return out.sort((a, b) => a.day - b.day);
}

/** 오늘 지금까지 주문이 지난 일주일 같은 시각까지의 평균과 견줘 얼마인지(원인은 말하지 않는다) */
export function paceVsUsual(s: GameState): number | null {
  const { day, hour } = s.clock;
  if (hour < s.settings.openHour + 2) return null;
  const count = (d: number) => s.orders.filter((o) => o.day === d && o.hour < hour && o.channel !== 'group').length;
  const past: number[] = [];
  for (let d = day - 7; d < day; d++) {
    const rec = s.ledger.days.find((x) => x.day === d);
    if (rec && orders(rec) > 0) past.push(count(d));
  }
  if (past.length < 3) return null;
  const usual = past.reduce((a, b) => a + b, 0) / past.length;
  if (usual < 5) return null;
  return count(day) / usual - 1;
}
