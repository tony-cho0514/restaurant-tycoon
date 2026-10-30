import type { ChargeState } from './charge';
import type { Economy } from './economy';
import type { IngredientId } from './ingredients';
import type { Inventory, ReorderRule } from './inventory';
import type { DayRecord, Ledger } from './ledger';
import type { Levers } from './levers';
import type { MenuItemId } from './menu';
import type { NeighborhoodId } from './neighborhoods';
import type { NewsState } from './news';
import type { LearningState } from './learning';
import type { LocalState } from './localEvents';
import type { GuideState } from './guide';
import type { BankState, ClosedShop } from './bank';
import type { BranchState } from './branch';
import type { MessageState } from './messages';
import type { OwnerState } from './owner';
import type { OrderRecord } from './orders';
import type { GroupOffer } from './groups';
import type { MenuActive } from './menu';
import type { Applicant, JobPost, Staff } from './staff';
import type { UpgradeId } from './upgrades';
import type { Ratings } from './ratings';
import type { Clock } from './time';

export interface GameState {
  version: 3;
  seed: number;
  rngState: number;
  createdAt: number;
  shopName: string;
  neighborhoodId: NeighborhoodId;
  clock: Clock;
  cash: number;
  cashNegative: boolean;
  economy: Economy;
  prices: Record<IngredientId, number>;
  menuPrices: Record<MenuItemId, number>;
  levers: Levers;
  ratings: Ratings;
  inventory: Inventory;
  rules: Record<IngredientId, ReorderRule>;
  news: NewsState;
  ledger: Ledger;
  today: DayRecord;
  charge: ChargeState;
  /** 운영 설정: 여는·닫는 시각(닫는 시각은 그 시각에 문을 닫음), 정기 휴무 요일(0=월), 손님이 내는 배달팁 */
  settings: Settings;
  /** 최근 7일 주문 기록 */
  orders: OrderRecord[];
  /** 개점 준비를 마친 마지막 날(하루에 한 번만 개점 처리) */
  openedDay: number;
  /** 지금 파는 메뉴와 개발해 둔 메뉴 */
  menuActive: MenuActive;
  menuDeveloped: Partial<MenuActive>;
  /** 알바(사장 제외), 지원자, 채용 공고 */
  staff: Staff[];
  applicants: Applicant[];
  jobPost: JobPost | null;
  /** 가게 업그레이드 단계 */
  upgrades: Record<UpgradeId, number>;
  /** 단체 주문: 들어온 제안과 받아 둔 주문 */
  groupOffers: GroupOffer[];
  groupOrders: GroupOffer[];
  /** 직원·지원자·단체 주문 번호 */
  nextStaffId: number;
  /** 오늘 결근한 직원 id */
  absentToday?: number[];
  /** 사장님: 스트레스·쉬는 날 */
  owner: OwnerState;
  /** 사이드 메시지: 리뷰·요청·알바 카톡·거래처·사장님 혼잣말 */
  messages: MessageState;
  /** 배움: 월말 부검 리포트, 위기 리포트, 도감, 내가 바꾼 결정 */
  learning: LearningState;
  /** 동네 사정: 공사·경쟁 가게·배달앱 노출 하락 */
  local: LocalState;
  /** 첫 10분 안내: 열린 탭, 눌러 본 탭, 첫 주 목표 */
  guide: GuideState;
  /** 대출과 통장 마이너스가 이어진 날 */
  bank: BankState;
  /** 문을 닫은 가게(폐업 부검을 보여 주고 새 가게로) */
  closed?: ClosedShop | null;
  /** 매니저가 맡은 2호점(배달 전문) */
  branch?: BranchState | null;
}

export interface Settings {
  openHour: number;
  closeHour: number;
  closedDay: number | null;
  deliveryTip: number;
}

export const DEFAULT_SETTINGS: Settings = { openHour: 11, closeHour: 22, closedDay: null, deliveryTip: 1000 };
