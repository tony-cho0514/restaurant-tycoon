// 직원 운영: 근무 시간대, 처리 능력, 채용 공고·지원자·면접·채용·해고, 결근·이직·성향 공개.
import { OWNER_PIZZAS_PER_HOUR } from './balance';
import { pushNews } from './news';
import type { Rng } from './rng';
import type { Applicant, Shift, Staff, Traits } from './staff';
import type { GameState } from './types';
import { ovenCap } from './upgradeOps';

const STAFF_BASE_PIZZAS = 5;
const STAFF_SPEED_PIZZAS = 4;
const SHIFT_SPLIT_HOUR = 16;

export const SHIFT_LABEL: Record<Shift, string> = { lunch: '점심', dinner: '저녁', full: '종일' };

export function worksAt(st: Staff | { shift: Shift }, hour: number): boolean {
  if (st.shift === 'lunch') return hour < SHIFT_SPLIT_HOUR;
  if (st.shift === 'dinner') return hour >= SHIFT_SPLIT_HOUR;
  return true;
}

export function shiftHours(s: GameState, shift: Shift): number {
  const { openHour, closeHour } = s.settings;
  if (shift === 'lunch') return Math.max(0, Math.min(SHIFT_SPLIT_HOUR, closeHour) - openHour);
  if (shift === 'dinner') return Math.max(0, closeHour - Math.max(SHIFT_SPLIT_HOUR, openHour));
  return closeHour - openHour;
}

export function staffWorking(s: GameState, hour: number): Staff[] {
  const absent = s.absentToday ?? [];
  return s.staff.filter((x) => worksAt(x, hour) && !absent.includes(x.id));
}

/** 시간당 만들 수 있는 피자: 사장 + 근무 중 알바(손 빠르기), 오븐 상한 */
export function capacityAt(s: GameState, hour: number): number {
  const crew = staffWorking(s, hour).reduce((a, x) => a + STAFF_BASE_PIZZAS + STAFF_SPEED_PIZZAS * x.traits.speed, 0);
  return Math.min(Math.round(OWNER_PIZZAS_PER_HOUR + crew) - (s.levers.reviewReplies ? 1 : 0), ovenCap(s));
}

/** 근무 중 알바의 친절함이 홀 만족도에 주는 보정 */
export function kindnessBonus(s: GameState, hour: number): number {
  const w = staffWorking(s, hour);
  if (w.length === 0) return 0;
  return 0.2 * (w.reduce((a, x) => a + x.traits.kindness, 0) / w.length - 0.5);
}

// ── 채용 ──────────────────────────────────────────────

const NAMES = ['이서준', '박지우', '최민서', '정하윤', '강도윤', '조서연', '윤지호', '장예린', '임시우', '한지민', '오유준', '서하은', '신준우', '권나연'];
const EXPERIENCE = ['처음이에요', '편의점 6개월', '카페 1년', '패스트푸드 8개월', '치킨집 1년', '피자집 2년'];

export const QUESTIONS: { q: string; trait: keyof Traits; answers: [string, string, string] }[] = [
  {
    q: '전에 음식점에서 일해 봤나요?', trait: 'speed',
    answers: ['아니요, 처음이에요. 열심히 배울게요!', '카페에서 몇 달 일해 봤어요. 주문 받는 건 익숙해요.', '네, 피자집에서 일했어요. 바쁠 때도 손이 빠르다는 말을 들었어요.'],
  },
  {
    q: '손님이 화를 내면 어떻게 할 거예요?', trait: 'kindness',
    answers: ['음… 사장님을 부를 것 같아요.', '일단 사과드리고 무엇이 불편하셨는지 여쭤볼게요.', '먼저 진심으로 사과하고, 다시 오고 싶게 해 드리는 게 제 일이라고 생각해요.'],
  },
  {
    q: '지각이나 결근을 한 적이 있나요?', trait: 'diligence',
    answers: ['솔직히… 가끔 늦잠을 자요.', '거의 없어요. 늦을 땐 미리 연락드려요.', '한 번도 없어요. 시간 약속은 꼭 지켜요.'],
  },
  {
    q: '얼마나 오래 일할 생각이에요?', trait: 'quitRisk',
    // 이직 성향은 낮을수록 좋은 답
    answers: ['방학 동안만 하려고요.', '일단 6개월 정도 생각하고 있어요.', '오래 일하고 싶어요. 1년 넘게도 괜찮아요.'],
  },
];

function level(v: number): 0 | 1 | 2 {
  return v < 0.4 ? 0 : v < 0.7 ? 1 : 2;
}

export function postJob(s: GameState, wage: number, shift: Shift): GameState {
  if (wage < s.economy.minWage) throw new Error('최저임금보다 낮은 시급은 안 돼요');
  return { ...s, jobPost: { wage, shift, postedDay: s.clock.day }, applicants: [] };
}

/** 공고 다음 날 개점 때 지원자 2~4명. 경력이 많으면 손이 빠르고 희망 시급도 높다. */
export function arriveApplicants(s: GameState, rng: Rng): GameState {
  if (!s.jobPost || s.jobPost.postedDay >= s.clock.day) return s;
  const count = rng.int(2, 4);
  const applicants: Applicant[] = [];
  let id = s.nextStaffId;
  for (let i = 0; i < count; i++) {
    const exp = rng.int(0, EXPERIENCE.length - 1);
    const traits: Traits = {
      speed: Math.min(1, Math.max(0, 0.2 + exp * 0.12 + rng.normal(0, 0.12))),
      kindness: Math.min(1, Math.max(0, rng.float())),
      diligence: Math.min(1, Math.max(0, rng.float())),
      quitRisk: Math.min(1, Math.max(0, rng.float())),
    };
    applicants.push({
      id: id++,
      name: rng.pick(NAMES),
      age: rng.int(19, 34),
      experience: EXPERIENCE[exp],
      wantWage: Math.max(s.jobPost.wage, Math.round((s.economy.minWage + exp * 250 + rng.int(0, 4) * 100) / 10) * 10),
      shift: s.jobPost.shift,
      traits,
      asked: [],
    });
  }
  const news = pushNews(s.news, {
    day: s.clock.day, kind: 'announce', important: true, tone: 'good',
    headline: `[채용] 지원자 ${count}명이 왔어요`,
    body: '직원 탭에서 이력을 보고 면접 질문을 골라 보세요. 질문은 사람마다 2개까지예요.',
  });
  return { ...s, applicants, jobPost: null, nextStaffId: id, news };
}

export function interview(s: GameState, applicantId: number, qIndex: number): { state: GameState; answer: string } {
  const a = s.applicants.find((x) => x.id === applicantId);
  if (!a) throw new Error('지원자를 찾을 수 없어요');
  if (a.asked.includes(qIndex)) throw new Error('이미 물어본 질문이에요');
  if (a.asked.length >= 2) throw new Error('질문은 2개까지예요');
  const answer = answerOf(a, qIndex);
  const applicants = s.applicants.map((x) => (x.id === applicantId ? { ...x, asked: [...x.asked, qIndex] } : x));
  return { state: { ...s, applicants }, answer };
}

/** 면접 답: 성향을 대체로 드러내지만 다섯 번에 한 번쯤은 겉치레 답을 한다. */
export function answerOf(a: Applicant, qIndex: number): string {
  const q = QUESTIONS[qIndex];
  const v = q.trait === 'quitRisk' ? 1 - a.traits.quitRisk : a.traits[q.trait];
  const bluff = (a.id * 31 + qIndex * 17) % 10 < 2;
  return q.answers[bluff ? ((a.id + qIndex) % 3) : level(v)];
}

export function hire(s: GameState, applicantId: number): GameState {
  const a = s.applicants.find((x) => x.id === applicantId);
  if (!a) throw new Error('지원자를 찾을 수 없어요');
  const staff: Staff = {
    id: a.id, name: a.name, age: a.age, wage: Math.max(a.wantWage, s.economy.minWage), shift: a.shift, traits: a.traits,
    revealed: {}, daysWorked: 0, hiredDay: s.clock.day,
  };
  return { ...s, staff: [...s.staff, staff], applicants: s.applicants.filter((x) => x.id !== applicantId) };
}

export function fire(s: GameState, staffId: number): GameState {
  return { ...s, staff: s.staff.filter((x) => x.id !== staffId) };
}

export function setShift(s: GameState, staffId: number, shift: Shift): GameState {
  return { ...s, staff: s.staff.map((x) => (x.id === staffId ? { ...x, shift } : x)) };
}

export function setWage(s: GameState, staffId: number, wage: number): GameState {
  if (wage < s.economy.minWage) throw new Error('최저임금보다 낮은 시급은 안 돼요');
  return { ...s, staff: s.staff.map((x) => (x.id === staffId ? { ...x, wage } : x)) };
}

// ── 하루 단위 사건 ───────────────────────────────────

const QUIT_GRACE_DAYS = 28;
const REVEAL_DAYS: [keyof Traits, number][] = [['speed', 7], ['kindness', 14], ['diligence', 21], ['quitRisk', 28]];

/** 개점 때: 결근, (월요일) 그만두기 */
export function staffMorning(s: GameState, rng: Rng, isMonday: boolean): GameState {
  let news = s.news;
  const absentToday = s.staff.filter((x) => rng.chance(0.05 * (1 - x.traits.diligence))).map((x) => x.id);
  for (const id of absentToday) {
    const x = s.staff.find((y) => y.id === id)!;
    news = pushNews(news, { day: s.clock.day, kind: 'flavor', important: false, tone: 'bad', headline: `[직원] ${x.name} 결근`, body: '오늘은 일손이 하나 모자라요.' });
  }
  let staff = s.staff;
  if (isMonday) {
    const openDays = 7 - (s.settings.closedDay === null ? 0 : 1);
    // 들어온 지 4주가 안 된 사람은 그만두지 않는다.
    const quitters = staff.filter((x) => {
      if (x.daysWorked < QUIT_GRACE_DAYS) return false;
      const p = x.traits.quitRisk * 0.05 + (x.wage < s.economy.minWage + 500 ? 0.05 : 0) + (x.shift === 'full' && openDays >= 6 ? 0.02 : 0);
      return rng.chance(p);
    });
    for (const q of quitters) {
      news = pushNews(news, {
        day: s.clock.day, kind: 'announce', important: true, tone: 'bad',
        headline: `[직원] ${q.name}이(가) 그만두겠대요`,
        body: '시급이 낮거나 일이 너무 많으면 더 쉽게 그만둬요. 직원 탭에서 새로 뽑을 수 있어요.',
      });
    }
    staff = staff.filter((x) => !quitters.includes(x));
  }
  return { ...s, staff, absentToday, news };
}

/** 마감 때: 일한 날 세기, 성향 차례로 드러나기 */
export function staffEvening(s: GameState): GameState {
  const absent = s.absentToday ?? [];
  const staff = s.staff.map((x) => {
    if (absent.includes(x.id) || shiftHours(s, x.shift) === 0) return x;
    const daysWorked = x.daysWorked + 1;
    const revealed = { ...x.revealed };
    for (const [t, d] of REVEAL_DAYS) if (daysWorked >= d) revealed[t] = true;
    return { ...x, daysWorked, revealed };
  });
  return { ...s, staff };
}

/** 새해 최저임금 인상: 그보다 낮은 시급은 자동으로 올린다. */
export function raiseToMinWage(s: GameState): GameState {
  const min = s.economy.minWage;
  const raised = s.staff.filter((x) => x.wage < min);
  if (raised.length === 0) return s;
  const news = pushNews(s.news, {
    day: s.clock.day, kind: 'announce', important: false, tone: 'neutral',
    headline: `[직원] 최저임금 인상으로 ${raised.length}명 시급 인상`,
    body: `새 최저임금 시급 ${min.toLocaleString('ko-KR')}원보다 낮던 시급을 맞춰 올렸어요.`,
  });
  return { ...s, staff: s.staff.map((x) => (x.wage < min ? { ...x, wage: min } : x)), news };
}
