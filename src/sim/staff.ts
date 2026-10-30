// 직원(알바): 근무 시간대, 시급, 숨은 성향(일하면서 드러남).
export type Shift = 'lunch' | 'dinner' | 'full';
export interface Traits {
  /** 손 빠르기: 시간당 만드는 피자 */
  speed: number;
  /** 친절함: 홀 만족도 */
  kindness: number;
  /** 성실함: 결근 */
  diligence: number;
  /** 이직 성향 */
  quitRisk: number;
}
export interface Staff {
  id: number;
  name: string;
  age: number;
  wage: number;
  shift: Shift;
  traits: Traits;
  revealed: Partial<Record<keyof Traits, boolean>>;
  daysWorked: number;
  hiredDay: number;
}
export interface Applicant {
  id: number;
  name: string;
  age: number;
  experience: string;
  wantWage: number;
  shift: Shift;
  traits: Traits;
  /** 면접에서 고른 질문 번호 */
  asked: number[];
}
export interface JobPost {
  wage: number;
  shift: Shift;
  postedDay: number;
}

export function initialStaff(minWage: number): Staff {
  return {
    id: 1, name: '김하늘', age: 22, wage: minWage, shift: 'full',
    traits: { speed: 0.5, kindness: 0.5, diligence: 0.6, quitRisk: 0.3 },
    revealed: {}, daysWorked: 0, hiredDay: 0,
  };
}
