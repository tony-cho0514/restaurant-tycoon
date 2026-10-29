# 첫 판 1부 「가게가 돌아간다」 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이패드에서 피자집 하나를 열고, 충전된 시간을 재생하며 가상 경제·뉴스 신호·재고·가격·운영 수단·장부를 겪는 「처음 해 볼 수 있는 판」을 만든다.

**Architecture:** 시뮬레이션은 `src/sim/`의 순수 TypeScript 함수(React·DOM 무의존, 시드 난수로 결정적)이고, 한 틱 = 영업 1시간이다. `src/ui/`의 React 화면은 `playTick`을 타이머로 불러 상태를 바꾸고, 틱마다 나오는 `AnimEvents`로 가게 장면을 움직인다. 저장은 기기 안(localStorage + 백업 키 + 파일 내보내기)이고 서버는 없다.

**Tech Stack:** TypeScript 5.6.3 · React 18.3.1 · Vite 5.4.11 · Vitest 2.1.8 (+ jsdom 25.0.1, @testing-library/react 16.1.0) · vite-plugin-pwa 0.21.1 · sharp 0.33.5(소재 압축 스크립트 전용) · Higgsfield(그림 소재)

**Spec:** `docs/superpowers/specs/2026-10-29-restaurant-tycoon-design.md`

**이 계획의 범위:** 설계 문서 11장 「첫 판」 중 1부. 2부(별도 계획)로 미루는 것: 직원 채용·면접, 알바 배치 규칙, 가게 단위 위기·기회(직원 퇴사·위생 점검·SNS 입소문 등), 부검 리포트, 경영 개념 도감, 힌트 줄이기, 폐업·재시작. 1부에서 직원은 「사장 + 알바 1명」 고정이다.

## Global Constraints

- 화면 문구는 전부 한국어. 돈은 `1,234,000원` 형식(`Intl.NumberFormat('ko-KR')`), 큰 금액 요약은 `2,000만 원`.
- 주 기기는 아이패드 사파리(iPadOS 17+). 가로 1180×820·세로 820×1180 둘 다 깨지지 않을 것. 터치 대상은 최소 44×44px.
- 서버·로그인·외부 API 없음. 게임 도중 AI로 문장을 만들지 않는다(문장은 `src/content/`의 틀 + 변수).
- 그림 소재는 Higgsfield 생성물만 쓴다. 코드로 도형을 짜 맞춘 3D 모형·Claude 자체 3D 생성 금지. 소재가 오기 전 자리 표시는 단색 2D 상자만 허용.
- `src/sim/**`은 `react`, `window`, `document`, `localStorage`를 import·참조하지 않는다. 같은 seed면 같은 결과.
- 밸런스 수치는 전부 `src/sim/balance.ts` 한 곳에 둔다. 밸런스 테스트가 실패하면 이 파일 수치만 조정한다.
- 시간: 영업 11시~22시(하루 11틱, hour 11..21) · 현실 1일 = 게임 7일 충전 · 충전 상한 21일(231틱) · 새 게임 충전 7일(77틱) · 기본 재생 속도 1주(77틱) = 150초 → 1틱 1,948ms, 배속 1×/2×/4×.
- 런타임 의존성은 `react`, `react-dom` 둘뿐.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. 재생 도중 앱을 닫거나 아이패드가 잠김 → 다시 열면 마지막 틱부터 이어지고, 충전이 두 번 쌓이거나 사라지지 않는다. (Task 10, Task 12 테스트)
2. 아이패드 시계가 뒤로 가거나 며칠 앞으로 감 → 충전이 음수가 되거나 상한(231틱)을 넘지 않는다. (Task 2 테스트)
3. 저장 데이터가 깨짐·저장 용량 초과·엉뚱한 파일 불러오기 → 하얀 화면 없이 백업에서 복구하거나 한국어로 안내한다. (Task 10 테스트)
4. 메뉴 가격을 0원·1억 원처럼 극단으로 넣음 → 1,000원~100,000원으로 묶이고 NaN·음수 원가율이 안 나온다. (Task 3, Task 13 테스트)
5. 게임 속 몇 년을 플레이 → 뉴스·장부 배열이 무한히 늘어 저장이 1MB를 넘지 않는다. (Task 9 테스트)

---

## 파일 구조

```
restaurant-tycoon/
  package.json  tsconfig.json  vite.config.ts  index.html  .gitignore
  scripts/compress-assets.mjs        소재 WebP 변환 (Task 15)
  public/assets/                     Higgsfield 소재 (Task 15)
  src/
    main.tsx
    sim/                             순수 시뮬레이션
      rng.ts  time.ts  charge.ts  balance.ts  neighborhoods.ts  ingredients.ts  menu.ts
      economy.ts  news.ts  inventory.ts  demand.ts  service.ts  ratings.ts  levers.ts
      ledger.ts  types.ts  newGame.ts  tick.ts  save.ts
    content/newsTemplates.ts         뉴스 문구 틀
    ui/
      App.tsx  format.ts  styles.css  sceneLayout.ts
      hooks/usePlayback.ts
      screens/NewGame.tsx  screens/Main.tsx
      components/PlaybackBar.tsx  PauseModal.tsx  ShopScene.tsx  SettingsMenu.tsx
      panels/StatusPanel.tsx  NewsPanel.tsx  MenuPanel.tsx  InventoryPanel.tsx  LeversPanel.tsx  LedgerPanel.tsx
  tests/sim/*.test.ts  tests/ui/*.test.tsx
```

---

### Task 1: 프로젝트 뼈대 · 시드 난수 · 게임 시계

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/ui/App.tsx`(「가게 준비 중」 한 줄), `src/sim/rng.ts`, `src/sim/time.ts`
- Test: `tests/sim/rng.test.ts`, `tests/sim/time.test.ts`

**Interfaces:**
- Produces:
  - `class Rng { constructor(state: number); state: number; float(): number; int(min: number, max: number): number /*양끝 포함*/; chance(p: number): boolean; normal(mean: number, sd: number): number; poisson(lambda: number): number; pick<T>(items: readonly T[]): T; weighted<T>(items: readonly { item: T; weight: number }[]): T }`
  - `OPEN_HOUR=11, CLOSE_HOUR=22, TICKS_PER_DAY=11, DAYS_PER_WEEK=7, DAYS_PER_MONTH=28, START_MONTH=3`
  - `interface Clock { day: number; hour: number }`, `type Season = 'spring'|'summer'|'autumn'|'winter'`
  - `calendar(c: Clock): { year: number; month: number; monthIndex: number; week: number; dayOfWeek: number /*0=월*/; dayOfMonth: number /*0..27*/; season: Season; isWeekend: boolean }`
  - `nextTick(c: Clock): Clock`, `formatClock(c: Clock): string`

- [ ] **Step 1: `git init`, package.json(Tech Stack 버전 그대로 고정, scripts: `dev: "vite --host"`, `build: "tsc --noEmit && vite build"`, `test: "vitest run"`), tsconfig(strict, jsx react-jsx), vite.config(react 플러그인, `base: process.env.GITHUB_PAGES ? '/restaurant-tycoon/' : '/'`, test.include `tests/**/*.test.{ts,tsx}`), `npm install`**

- [ ] **Step 2: 실패하는 테스트 작성**

```ts
// tests/sim/rng.test.ts
test('같은 seed면 같은 수열', () => {
  const a = new Rng(42), b = new Rng(42);
  expect([a.float(), a.float(), a.int(1, 6)]).toEqual([b.float(), b.float(), b.int(1, 6)]);
});
test('state를 저장했다 복원하면 이어서 같은 수열', () => {
  const a = new Rng(7); a.float(); const saved = a.state;
  const x = a.float(); expect(new Rng(saved).float()).toBe(x);
});
test('int는 양끝 포함, float는 [0,1)', () => {
  const r = new Rng(1); const seen = new Set<number>();
  for (let i = 0; i < 10000; i++) { const v = r.int(1, 3); seen.add(v); const f = r.float(); expect(f >= 0 && f < 1).toBe(true); }
  expect([...seen].sort()).toEqual([1, 2, 3]);
});
test('poisson 평균 ≈ lambda, lambda 0이면 0', () => {
  const r = new Rng(3); let s = 0; for (let i = 0; i < 20000; i++) s += r.poisson(6);
  expect(Math.abs(s / 20000 - 6)).toBeLessThan(0.1); expect(r.poisson(0)).toBe(0);
});
// tests/sim/time.test.ts
test('달력', () => {
  expect(calendar({ day: 0, hour: 11 })).toMatchObject({ year: 1, month: 3, week: 1, dayOfWeek: 0, season: 'spring', isWeekend: false });
  expect(calendar({ day: 28, hour: 11 }).month).toBe(4);
  expect(calendar({ day: 280, hour: 11 })).toMatchObject({ year: 2, month: 1, season: 'winter' });
  expect(calendar({ day: 5, hour: 11 }).isWeekend).toBe(true);
});
test('틱 넘기기와 표기', () => {
  expect(nextTick({ day: 0, hour: 21 })).toEqual({ day: 1, hour: 11 });
  expect(nextTick({ day: 0, hour: 11 })).toEqual({ day: 0, hour: 12 });
  expect(formatClock({ day: 9, hour: 14 })).toBe('1년차 3월 2주 수요일 14시');
});
```

- [ ] **Step 3: `npm test` → FAIL(모듈 없음) 확인**
- [ ] **Step 4: `rng.ts`(mulberry32, normal은 Box–Muller, poisson은 λ<30이면 Knuth·이상이면 정규 근사 반올림), `time.ts` 구현.** 계절: 3–5 봄, 6–8 여름, 9–11 가을, 12–2 겨울. 요일 이름 `['월','화','수','목','금','토','일']`.
- [ ] **Step 5: `npm test` → PASS, `npm run build` 통과**
- [ ] **Step 6: Commit** `feat: 프로젝트 뼈대, 시드 난수, 게임 시계`

---

### Task 2: 시간 충전

**Files:** Create `src/sim/charge.ts` · Test `tests/sim/charge.test.ts`

**Interfaces:**
- Produces: `CHARGE_TICKS_PER_REAL_DAY = 77`, `CHARGE_CAP_TICKS = 231`, `NEW_GAME_CHARGE_TICKS = 77`, `interface ChargeState { ticks: number; lastAccruedAt: number /*ms*/ }`, `accrueCharge(c, nowMs): ChargeState`, `canPlay(c): boolean`(ticks ≥ 1), `consumeTick(c): ChargeState`(1 미만이면 `Error('충전된 시간이 없어요')`), `formatCharge(ticks: number): string`

- [ ] **Step 1: 실패하는 테스트**

```ts
const DAY = 86_400_000;
test('현실 하루 = 77틱, 반나절 = 38.5틱', () => {
  expect(accrueCharge({ ticks: 0, lastAccruedAt: 0 }, DAY).ticks).toBeCloseTo(77);
  expect(accrueCharge({ ticks: 0, lastAccruedAt: 0 }, DAY / 2).ticks).toBeCloseTo(38.5);
});
test('상한 231틱', () => {
  expect(accrueCharge({ ticks: 200, lastAccruedAt: 0 }, 10 * DAY).ticks).toBe(231);
});
test('시계가 뒤로 가면 충전은 그대로, 기준 시각만 당겨짐', () => {
  const c = accrueCharge({ ticks: 10, lastAccruedAt: 5 * DAY }, 4 * DAY);
  expect(c).toEqual({ ticks: 10, lastAccruedAt: 4 * DAY });
});
test('소비와 표기', () => {
  expect(consumeTick({ ticks: 1.5, lastAccruedAt: 0 }).ticks).toBeCloseTo(0.5);
  expect(() => consumeTick({ ticks: 0.5, lastAccruedAt: 0 })).toThrow('충전된 시간이 없어요');
  expect(formatCharge(58.7)).toBe('5일 3시간');
  expect(formatCharge(0.4)).toBe('0일 0시간');
});
```

- [ ] **Step 2: FAIL 확인 → Step 3: 구현 → Step 4: PASS 확인**
- [ ] **Step 5: Commit** `feat: 시간 충전`

---

### Task 3: 밸런스 수치 · 동네 · 식자재 시세 · 메뉴 원가

**Files:** Create `src/sim/balance.ts`, `src/sim/neighborhoods.ts`, `src/sim/ingredients.ts`, `src/sim/menu.ts` · Test `tests/sim/catalog.test.ts`

**Interfaces:**
- Produces:
  - `balance.ts`: `START_CAPITAL = 100_000_000`, `INTERIOR_AND_EQUIPMENT = 30_000_000`, `FX_BASE = 1350`, `IMPORT_PASS_THROUGH = 0.7`, `PREMIUM_CHEESE_MULT = 1.3`, `MISC_COST_PER_PIZZA = 800`, `COLA_ATTACH_RATE = 0.45`, `APP_FEE_RATE = 0.128`, `DELIVERY_FEE_OWNER = 3000`, `INSULATED_BOX_COST = 400`, `APP_ADS_WEEKLY = 88_000`, `APP_ADS_DEMAND = 1.15`, `UTILITIES_PER_DAY = 30_000`, `LABOR_OVERHEAD = 1.2`, `START_MIN_WAGE = 10_030`, `STAFF_COUNT = 2`, `PIZZAS_PER_STAFF_HOUR = 7`, `OVEN_CAP_PER_HOUR = 16`, `PRICE_ELASTICITY = 1.5`, `RECESSION_SENSITIVITY_MULT = 1.3`, `VEG_SEASONAL: Record<number /*월*/, number> = {1:1.25,2:1.3,3:1.15,4:1.0,5:0.9,6:0.85,7:0.95,8:1.2,9:1.1,10:0.9,11:0.85,12:1.1}`, `WEATHER_DEMAND = { sunny:{hall:1,delivery:1}, cloudy:{hall:1,delivery:1}, rain:{hall:0.7,delivery:1.25}, heat:{hall:0.85,delivery:1.15}, cold:{hall:0.9,delivery:1.1} }`
  - `neighborhoods.ts`: `type NeighborhoodId = 'campus'|'office'|'residential'`, `interface Neighborhood { id; name; traits: string[] /*3줄*/; baseDailyOrders; deliveryShare; priceSensitivity; weekendFactor; hourCurve: number[] /*길이 11, hour 11..21*/; listing: { deposit; monthlyRent; keyMoney; sizePyeong } }`, `NEIGHBORHOODS: Record<NeighborhoodId, Neighborhood>`, `cashAfterSetup(n: Neighborhood): number`
  - `ingredients.ts`: `type IngredientId = 'flour'|'mozzarella'|'tomatoSauce'|'pepperoni'|'veg'|'box'|'cola'|'cola500'`, `INGREDIENTS: Record<IngredientId, { name; unit; basePrice; imported: boolean; seasonal: boolean; shelfLifeDays; storageMaxDays }>`, `ingredientPrice(id, ctx: { fx: number; inflation: number; month: number; shockMult: number; noise: number }): number`(원 단위 반올림)
  - `menu.ts`: `type MenuItemId = 'cheese'|'pepperoni'|'combo'|'cola'`, `type PizzaId = Exclude<MenuItemId,'cola'>`, `MENU: Record<MenuItemId, { name; defaultPrice; recipe: Partial<Record<IngredientId, number>>; isPizza: boolean; baseMix: number }>`, `unitCost(id, prices: Record<IngredientId, number>, opts: { premiumCheese: boolean }): number`, `clampMenuPrice(price: number): number`

수치(설계 문서가 빌더에게 맡긴 것, 여기서 고정):

| 동네 | 이름 | 하루 기본 주문 | 배달 비중 | 가격 민감도 | 주말 배수 | 보증금 / 권리금 / 월세 | 평수 |
|---|---|---|---|---|---|---|---|
| campus | 대학가 「새내기길」 | 40 | 0.60 | 1.4 | 0.9 | 2,000만 / 3,000만 / 150만 | 12 |
| office | 오피스 상권 「유리타워 앞」 | 42 | 0.40 | 0.8 | 0.5 | 2,500만 / 2,500만 / 230만 | 15 |
| residential | 주택가 「은행나무 마을」 | 38 | 0.75 | 1.0 | 1.3 | 1,500만 / 1,500만 / 110만 | 10 |

시간대 곡선(hour 11..21): campus `[.6,1.0,.9,.5,.5,.6,.9,1.2,1.3,1.1,.8]` · office `[.8,1.6,1.2,.4,.3,.4,.8,1.0,.7,.4,.2]` · residential `[.4,.7,.6,.4,.4,.6,1.1,1.5,1.4,1.0,.6]`

| 식자재 | 단위 | 기준가 | 수입 | 계절 | 보관(일) | 창고 상한(일치) |
|---|---|---|---|---|---|---|
| flour 밀가루 | kg | 1,500 | ✓ | | 90 | 45 |
| mozzarella 모짜렐라 치즈 | kg | 12,000 | ✓ | | 60 | 30 |
| tomatoSauce 토마토소스 | kg | 6,000 | ✓ | | 45 | 30 |
| pepperoni 페퍼로니 | kg | 20,000 | ✓ | | 45 | 30 |
| veg 채소 믹스 | kg | 5,000 | | ✓ | 5 | 7 |
| box 피자 박스 | 개 | 700 | | | 365 | 60 |
| cola 콜라 1.25L | 병 | 1,300 | | | 180 | 30 |
| cola500 콜라 500ml(서비스용) | 병 | 800 | | | 180 | 30 |

가격식: `basePrice × inflation × (imported ? (fx/FX_BASE)^IMPORT_PASS_THROUGH : 1) × (seasonal ? VEG_SEASONAL[month] : 1) × shockMult × noise`

| 메뉴 | 기본가 | 레시피(kg 또는 개) | baseMix |
|---|---|---|---|
| cheese 치즈 피자 L | 18,900 | flour .25, mozzarella .25, tomatoSauce .1, box 1 | .30 |
| pepperoni 페퍼로니 피자 L | 20,900 | flour .25, mozzarella .22, tomatoSauce .1, pepperoni .06, box 1 | .35 |
| combo 콤비네이션 피자 L | 22,900 | flour .25, mozzarella .22, tomatoSauce .1, pepperoni .04, veg .12, box 1 | .35 |
| cola 콜라 1.25L | 2,500 | cola 1 | — |

피자 `unitCost`는 레시피 합 + `MISC_COST_PER_PIZZA`, premiumCheese면 mozzarella 몫만 ×`PREMIUM_CHEESE_MULT`. `clampMenuPrice`: 1,000~100,000으로 묶고 100원 단위 반올림, NaN이면 1,000.

- [ ] **Step 1: 실패하는 테스트**

```ts
const base = { fx: 1350, inflation: 1, month: 4, shockMult: 1, noise: 1 };
test('기준 조건이면 기준가', () => { expect(ingredientPrice('mozzarella', base)).toBe(12000); });
test('환율 20% 상승 → 수입품은 0.7 승만큼만', () => {
  expect(ingredientPrice('mozzarella', { ...base, fx: 1620 })).toBeCloseTo(13634, -1);
  expect(ingredientPrice('box', { ...base, fx: 1620 })).toBe(700);
});
test('채소는 8월에 1.2배', () => { expect(ingredientPrice('veg', { ...base, month: 8 })).toBe(6000); });
test('메뉴 원가', () => {
  const p = Object.fromEntries(Object.entries(INGREDIENTS).map(([k, v]) => [k, v.basePrice])) as Record<IngredientId, number>;
  expect(unitCost('cheese', p, { premiumCheese: false })).toBe(5475);
  expect(unitCost('cheese', p, { premiumCheese: true })).toBe(6375);
  expect(unitCost('cola', p, { premiumCheese: false })).toBe(1300);
});
test('가격 범위 묶기', () => {
  expect(clampMenuPrice(0)).toBe(1000); expect(clampMenuPrice(1e8)).toBe(100000);
  expect(clampMenuPrice(18950)).toBe(19000); expect(clampMenuPrice(NaN)).toBe(1000);
});
test('동네 데이터', () => {
  for (const n of Object.values(NEIGHBORHOODS)) expect(n.hourCurve).toHaveLength(11);
  expect(cashAfterSetup(NEIGHBORHOODS.campus)).toBe(20_000_000);
  expect(cashAfterSetup(NEIGHBORHOODS.office)).toBe(20_000_000);
  expect(cashAfterSetup(NEIGHBORHOODS.residential)).toBe(40_000_000);
});
```

- [ ] **Step 2: FAIL → Step 3: 구현(동네 `traits`는 표의 성격을 한국어 3줄로) → Step 4: PASS**
- [ ] **Step 5: Commit** `feat: 동네·식자재·메뉴 데이터와 원가 계산`

---

### Task 4: 가상 경제

**Files:** Create `src/sim/economy.ts` · Test `tests/sim/economy.test.ts`

**Interfaces:**
- Consumes: `Rng`, `Season`, balance 상수
- Produces: `type Cycle = 'boom'|'normal'|'recession'`, `type Weather = 'sunny'|'cloudy'|'rain'|'heat'|'cold'`, `interface Economy { cycle: Cycle; cycleWeeksLeft: number; fx: number; inflation: number; minWage: number; pendingMinWage: number | null; weather: Weather }`, `initialEconomy(rng): Economy`, `stepEconomyWeek(e, rng): Economy`, `rollWeather(season, rng): Weather`, `CYCLE_DEMAND: Record<Cycle, number> = { boom: 1.1, normal: 1.0, recession: 0.85 }`

규칙: 시작 `{ cycle:'normal', cycleWeeksLeft: int(20,36), fx:1350, inflation:1, minWage:START_MIN_WAGE, pendingMinWage:null, weather:'sunny' }`. 주간: `fx *= 1 + normal(drift, 0.008)`(drift boom −0.001 / normal 0 / recession +0.003), [1000, 1800]로 묶음 · `inflation *= 1 + {boom:0.0009, normal:0.0006, recession:0.0003}[cycle]`(잡음 없음) · `cycleWeeksLeft = max(0, n−1)`. 경기 전환 자체는 여기서 하지 않는다(Task 5 뉴스가 신호와 함께 일으킨다).
날씨 확률: 봄 sunny .5 cloudy .3 rain .2 · 여름 sunny .3 cloudy .2 rain .3 heat .2 · 가을 sunny .55 cloudy .3 rain .15 · 겨울 sunny .4 cloudy .3 cold .3

- [ ] **Step 1: 실패하는 테스트**

```ts
test('10년 돌려도 환율은 1000~1800', () => {
  const r = new Rng(9); let e = initialEconomy(r);
  for (let i = 0; i < 520; i++) { e = stepEconomyWeek(e, r); expect(e.fx).toBeGreaterThanOrEqual(1000); expect(e.fx).toBeLessThanOrEqual(1800); }
});
test('보통 경기 1년 물가 ≈ 3.17%', () => {
  const r = new Rng(1); let e = { ...initialEconomy(r), cycleWeeksLeft: 999 };
  for (let i = 0; i < 52; i++) e = stepEconomyWeek(e, r);
  expect(e.inflation).toBeCloseTo(1.0317, 3);
});
test('침체기 환율이 평균적으로 더 오른다', () => {
  const avg = (cycle: Cycle) => { let s = 0; for (let seed = 1; seed <= 200; seed++) { const r = new Rng(seed); let e = { ...initialEconomy(r), cycle, cycleWeeksLeft: 999 }; for (let i = 0; i < 52; i++) e = stepEconomyWeek(e, r); s += e.fx; } return s / 200; };
  expect(avg('recession')).toBeGreaterThan(avg('normal'));
});
test('계절별 날씨', () => {
  const r = new Rng(5); const w: Record<string, number> = {};
  for (let i = 0; i < 20000; i++) { const x = rollWeather('winter', r); w[x] = (w[x] ?? 0) + 1; expect(rollWeather('summer', r)).not.toBe('cold'); }
  expect(w.heat).toBeUndefined(); expect(Math.abs(w.cold / 20000 - 0.3)).toBeLessThan(0.03);
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: Commit** `feat: 가상 경제와 날씨`

---

### Task 5: 뉴스 · 신호 · 충격

**Files:** Create `src/sim/news.ts`, `src/content/newsTemplates.ts` · Test `tests/sim/news.test.ts`

**Interfaces:**
- Consumes: `Rng`, `Economy`, `IngredientId`
- Produces:
  - `type ShockType = 'FX_SPIKE'|'FX_DROP'|'CHEESE_SHORTAGE'|'VEG_HARVEST'|'RECESSION'|'BOOM'|'RECOVERY'|'FESTIVAL'`
  - `interface PendingShock { id: string; type: ShockType; signalDay: number; fireDay: number; real: boolean; magnitude: number }`
  - `interface ActiveShock { type: 'CHEESE_SHORTAGE'|'VEG_HARVEST'|'FESTIVAL'; untilDay: number; magnitude: number }`
  - `interface NewsItem { id: string; day: number; kind: 'signal'|'fire'|'fizzle'|'announce'|'flavor'; headline: string; body: string; important: boolean; shockType?: ShockType; tone: 'bad'|'good'|'neutral' }`
  - `interface NewsState { pending: PendingShock[]; active: ActiveShock[]; items: NewsItem[]; nextId: number }`, `NEWS_KEEP = 200`
  - `planWeek(ns, econ, day, rng, place: string): { news: NewsState; economy: Economy }` — 월요일 개점 때 호출
  - `fireDue(ns, econ, day, rng, place): { news: NewsState; economy: Economy }` — 매일 개점 때 호출
  - `announceMinWage(ns, econ, day, rng): { news; economy }`(7월 첫날), `applyMinWage(econ): Economy`(1월 첫날)
  - `dailyFlavor(ns, day, rng, place): NewsState`
  - `shockMultiplier(active: ActiveShock[], id: IngredientId, day: number): number`, `demandShock(active, day): { hall: number; delivery: number }`
  - `newsTemplates.ts`: `type Tpl = { headline: string; body: string }`, `NEWS_TEMPLATES: Record<ShockType, { signal: Tpl[]; fire: Tpl[]; fizzle: Tpl[] }>`, `FLAVOR_TEMPLATES: Tpl[]`, `MIN_WAGE_TEMPLATES: Tpl[]`, `fillTemplate(t: Tpl, vars: Record<string, string>): Tpl`

규칙:

| 충격 | 예약 가중치 | 신호 적중률 | 신호→발생 | 크기 | 효과 | 톤 |
|---|---|---|---|---|---|---|
| FX_SPIKE | 3 | 0.8 | 7~21일 | 0.08~0.15 | fx × (1+크기) | bad |
| FX_DROP | 2 | 0.8 | 7~21일 | 0.05~0.10 | fx × (1−크기) | good |
| CHEESE_SHORTAGE | 3 | 0.8 | 7~21일 | 0.30~0.50 | 42일간 mozzarella 가격 × (1+크기) | bad |
| VEG_HARVEST | 2 | 0.8 | 7~21일 | 0.20~0.35 | 28일간 veg 가격 × (1−크기) | good |
| FESTIVAL | 2 | 0.95 | 7~14일 | — | 3일간 수요 홀 ×1.6, 배달 ×1.2 | good |
| RECESSION / BOOM / RECOVERY | 경기 순환 | 1.0 | max(cycleWeeksLeft, 1)×7 | — | cycle 변경, cycleWeeksLeft = int(16,40) | bad / good / good |

- `planWeek`: (1) `econ.cycleWeeksLeft ≤ 3`이고 경기 충격 대기가 없으면 예약: normal → BOOM .4 / RECESSION .4 / 「유지」 .2(유지면 신호 없이 cycleWeeksLeft=int(16,40)), boom·recession → RECOVERY. (2) 확률 0.35로 위 표의 비경기 충격 하나를 가중치로 뽑아 예약(같은 종류가 이미 대기 중이면 건너뜀). 예약할 때 즉시 `signal` 뉴스(important=true)를 낸다.
- `fireDue`: fireDay가 된 대기 충격 처리. real이면 효과 적용 + `fire` 뉴스(important=true), 아니면 `fizzle` 뉴스(important=false). untilDay 지난 active는 제거.
- 최저임금: 70%는 2~5%, 25%는 5~9%, 5%는 12~16% 인상, 10원 단위 반올림. 발표 뉴스 important=true.
- 신호 문구는 방향만 말하고 미래 수치를 말하지 않는다(`{pct}`는 fire·announce 문구에서만). 틀마다 signal ≥3, fire ≥2, fizzle ≥2, FLAVOR ≥20, MIN_WAGE ≥2. 변수: `{pct}`, `{place}`, `{wage}`. 내용은 실제 경제 원리와 맞을 것(예: 환율 상승 → 수입 재료 부담).
- items는 최신 `NEWS_KEEP`개만 유지.

- [ ] **Step 1: 실패하는 테스트**

```ts
function run(seed: number, weeks: number) {
  const r = new Rng(seed); let econ = initialEconomy(r); let ns: NewsState = { pending: [], active: [], items: [], nextId: 1 };
  const fired: { type: ShockType; day: number }[] = []; const signals: { type: ShockType; day: number }[] = [];
  for (let d = 0; d < weeks * 7; d++) {
    if (d % 7 === 0) { econ = stepEconomyWeek(econ, r); ({ news: ns, economy: econ } = planWeek(ns, econ, d, r, '새내기길')); }
    ({ news: ns, economy: econ } = fireDue(ns, econ, d, r, '새내기길'));
    for (const it of ns.items) if (it.day === d && it.shockType) (it.kind === 'fire' ? fired : it.kind === 'signal' ? signals : []).push({ type: it.shockType, day: d });
  }
  return { fired, signals, ns };
}
test('신호 없이 터지는 충격은 없다', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { fired, signals } = run(seed, 200);
    for (const f of fired) expect(signals.some(s => s.type === f.type && s.day <= f.day - 7)).toBe(true);
  }
});
test('FX_SPIKE 빗나감 비율 10~30%', () => {
  let fire = 0, fizzle = 0;
  for (let seed = 1; seed <= 60; seed++) for (const it of run(seed, 200).ns.items) if (it.shockType === 'FX_SPIKE') { if (it.kind === 'fire') fire++; if (it.kind === 'fizzle') fizzle++; }
  const rate = fizzle / (fire + fizzle); expect(rate).toBeGreaterThan(0.1); expect(rate).toBeLessThan(0.3);
});
test('치즈 파동과 축제 효과', () => {
  const active: ActiveShock[] = [{ type: 'CHEESE_SHORTAGE', untilDay: 50, magnitude: 0.4 }, { type: 'FESTIVAL', untilDay: 12, magnitude: 0.6 }];
  expect(shockMultiplier(active, 'mozzarella', 49)).toBeCloseTo(1.4); expect(shockMultiplier(active, 'mozzarella', 51)).toBe(1);
  expect(demandShock(active, 10)).toEqual({ hall: 1.6, delivery: 1.2 });
});
test('같은 종류는 동시에 두 번 대기하지 않고, 뉴스는 200개까지', () => {
  const { ns } = run(4, 520);
  const types = ns.pending.map(p => p.type); expect(new Set(types).size).toBe(types.length);
  expect(ns.items.length).toBeLessThanOrEqual(200);
});
test('모든 틀의 변수가 채워진다', () => {
  const all = [...Object.values(NEWS_TEMPLATES).flatMap(t => [...t.signal, ...t.fire, ...t.fizzle]), ...FLAVOR_TEMPLATES, ...MIN_WAGE_TEMPLATES];
  for (const t of all) { const f = fillTemplate(t, { pct: '12', place: '새내기길', wage: '10,350' }); expect(f.headline + f.body).not.toMatch(/[{}]/); }
  for (const t of Object.values(NEWS_TEMPLATES).flatMap(x => x.signal)) expect(t.headline + t.body).not.toMatch(/\d/);
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: Commit** `feat: 뉴스 신호와 경제 충격`

---

### Task 6: 재고와 발주

**Files:** Create `src/sim/inventory.ts` · Test `tests/sim/inventory.test.ts`

**Interfaces:**
- Consumes: `IngredientId`, `INGREDIENTS`
- Produces: `interface Lot { qty: number; unitCost: number; expiresDay: number }`, `type Inventory = Record<IngredientId, Lot[]>`, `interface ReorderRule { reorderDays: number; targetDays: number }`, `DEFAULT_RULES: Record<IngredientId, ReorderRule>`, `type Usage = Partial<Record<IngredientId, number>>`, `emptyInventory(): Inventory`, `stockOf(inv, id): number`, `buy(inv, id, qty, unitCost, today): Inventory`, `canMake(inv, recipe: Usage): boolean`, `consume(inv, id, qty): { inv: Inventory; cost: number; shortfall: number }`(FIFO), `expire(inv, today): { inv; wasteCost: number; wasted: Usage }`, `dailyUsageEstimate(recent: Usage[], id, fallback: number): number`(최근 7일 평균, 기록 없으면 fallback), `autoReorder(inv, rules, usage: Record<IngredientId, number>, prices, today): { inv; spent: number; bought: Usage }`, `manualBuyDays(inv, id, days, usage, prices, today): { inv; spent: number; capped: boolean }`

규칙: 산 물건은 `today + shelfLifeDays`에 만료(그날 영업 끝까지는 사용 가능, `expiresDay < today`면 폐기). 자동 발주: 재고 < `reorderDays × 하루 사용량`이면 `targetDays × 사용량 − 재고`만큼 산다. 자동·수동 모두 창고 상한 `storageMaxDays × 사용량`을 넘지 않게 자른다. 기본 규칙: flour 3/10, mozzarella 3/7, tomatoSauce 3/10, pepperoni 3/7, veg 1/2, box 5/14, cola 3/7, cola500 3/7.

- [ ] **Step 1: 실패하는 테스트**

```ts
test('먼저 산 것부터 쓴다', () => {
  let inv = buy(buy(emptyInventory(), 'mozzarella', 1, 10000, 0), 'mozzarella', 1, 12000, 1);
  const r = consume(inv, 'mozzarella', 1.5); expect(r.cost).toBe(16000); expect(r.shortfall).toBe(0);
  expect(consume(r.inv, 'mozzarella', 1).shortfall).toBeCloseTo(0.5);
});
test('채소는 5일 지나면 버려지고 폐기 비용이 잡힌다', () => {
  const inv = buy(emptyInventory(), 'veg', 2, 5000, 0);
  expect(expire(inv, 5).wasteCost).toBe(0); const e = expire(inv, 6);
  expect(e.wasteCost).toBe(10000); expect(stockOf(e.inv, 'veg')).toBe(0);
});
test('자동 발주는 기준 아래일 때 목표까지', () => {
  const usage = { ...zeroUsage(), mozzarella: 10 }; const prices = basePrices();
  const r = autoReorder(buy(emptyInventory(), 'mozzarella', 20, 12000, 0), DEFAULT_RULES, usage, prices, 0);
  expect(stockOf(r.inv, 'mozzarella')).toBe(70); expect(r.spent).toBe(50 * 12000);
});
test('미리 사기는 창고 상한에서 잘린다', () => {
  const r = manualBuyDays(emptyInventory(), 'mozzarella', 60, { ...zeroUsage(), mozzarella: 10 }, basePrices(), 0);
  expect(stockOf(r.inv, 'mozzarella')).toBe(300); expect(r.capped).toBe(true);
});
```
(`zeroUsage()`(모든 재료 0), `basePrices()`(모든 재료 기준가)는 이 Task에서 `tests/sim/helpers.ts`를 만들어 넣는다. 이후 Task의 테스트 도우미도 전부 이 파일에 모은다.)

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: Commit** `feat: 재고, 폐기, 자동 발주`

---

### Task 7: 한 시간 영업 — 수요 · 처리 · 만족도 · 평점

**Files:** Create `src/sim/demand.ts`, `src/sim/service.ts`, `src/sim/ratings.ts`, `src/sim/levers.ts`(이 Task에서는 `LeverId`·`Levers` 타입만) · Test `tests/sim/hour.test.ts`

**Interfaces:**
- Consumes: `Neighborhood`, `Economy`, `CYCLE_DEMAND`, `MENU`, balance 상수, `calendar`
- Produces:
  - `levers.ts`: `type LeverId = 'freeCola'|'premiumCheese'|'insulatedBox'|'reviewReplies'|'appAds'`, `type Levers = Record<LeverId, boolean>` (Task 8이 같은 파일에 나머지를 채운다)
  - `interface Ratings { hall: number; delivery: number }`
  - `priceIndex(menuPrices: Record<MenuItemId, number>, inflation: number): number` — 피자 baseMix 가중 평균 가격 ÷ (기본가 × inflation) 가중 평균
  - `orderMix(menuPrices, inflation, priceSensitivity): Record<PizzaId, number>` — `baseMix × ((기본가×inflation)/가격)^(2×민감도)` 정규화
  - `expectedOrders(inp: { n: Neighborhood; hour: number; isWeekend: boolean; economy: Economy; menuPrices; ratings: Ratings; levers: Levers; shock: { hall: number; delivery: number } }): { hall: number; delivery: number }`
  - `capacityPerHour(levers: Levers): number` — `min(STAFF_COUNT × PIZZAS_PER_STAFF_HOUR − (reviewReplies ? 1 : 0), OVEN_CAP_PER_HOUR)`
  - `serveHour(hall: number, delivery: number, capacity: number): { servedHall; servedDelivery; lost; waitHall; waitDelivery }`
  - `satisfaction(ch: 'hall'|'delivery', ctx: { wait: number; priceIndex: number; priceSensitivity: number; levers: Levers }, rng): number`
  - `updateRating(r: Ratings, ch, sat: number, levers: Levers): Ratings`

수요식:
```
base   = n.baseDailyOrders × n.hourCurve[hour−11] / Σ n.hourCurve
sens   = n.priceSensitivity × (cycle==='recession' ? RECESSION_SENSITIVITY_MULT : 1)
common = CYCLE_DEMAND[cycle] × (isWeekend ? n.weekendFactor : 1) × priceIndex^(−PRICE_ELASTICITY × sens)
hall     = base × (1−n.deliveryShare) × common × WEATHER_DEMAND[w].hall     × (ratings.hall/4.5)^3     × shock.hall
delivery = base × n.deliveryShare     × common × WEATHER_DEMAND[w].delivery × (ratings.delivery/4.5)^3 × shock.delivery × (appAds ? APP_ADS_DEMAND : 1)
```
처리: `served 합 = min(hall+delivery, floor(capacity×1.2))`, 넘친 주문은 배달부터 잃는다(앱 자동 거절). `load = (hall+delivery)/capacity`, `k = load ≤ 0.8 ? 1 : 1 + 2×(load−0.8)`, `waitHall = 15k`, `waitDelivery = 35k`(분).
만족도: `3.8 + (premiumCheese ? 0.4 : 0) + (배달이면 freeCola 0.3 + insulatedBox 0.2) − 대기 벌점(배달 max(0,(wait−35)/20), 홀 max(0,(wait−15)/10)) − max(0, priceIndex−1)×2×민감도 + normal(0, 0.3)`, [1, 5]로 묶음.
평점: `r += α(sat − r)`, α 홀 0.02·배달 0.03, `reviewReplies`가 켜져 있고 sat < r이면 α × 0.7(답글이 나쁜 리뷰 충격을 줄임).

- [ ] **Step 1: 실패하는 테스트**

```ts
const econ = { cycle: 'normal', cycleWeeksLeft: 30, fx: 1350, inflation: 1, minWage: 10030, pendingMinWage: null, weather: 'sunny' } as Economy;
const off: Levers = { freeCola: false, premiumCheese: false, insulatedBox: false, reviewReplies: false, appAds: false };
const def = Object.fromEntries(Object.entries(MENU).map(([k, v]) => [k, v.defaultPrice])) as Record<MenuItemId, number>;
const inp = (o: object = {}) => ({ n: NEIGHBORHOODS.campus, hour: 11, isWeekend: false, economy: econ, menuPrices: def, ratings: { hall: 4.5, delivery: 4.5 }, levers: off, shock: { hall: 1, delivery: 1 }, ...o });
const daily = (o: object = {}) => { let h = 0, d = 0; for (let hour = 11; hour <= 21; hour++) { const e = expectedOrders(inp({ ...o, hour })); h += e.hall; d += e.delivery; } return { h, d, t: h + d }; };
test('기본 조건 대학가 하루 40건, 배달 60%', () => { expect(daily().t).toBeCloseTo(40); expect(daily().d).toBeCloseTo(24); });
test('비 오면 홀 0.7배·배달 1.25배', () => { const r = daily({ economy: { ...econ, weather: 'rain' } }); expect(r.h).toBeCloseTo(16 * 0.7); expect(r.d).toBeCloseTo(24 * 1.25); });
test('가격 20% 올리면 대학가 주문 × 1.2^-2.1', () => {
  const up = Object.fromEntries(Object.entries(def).map(([k, v]) => [k, v * 1.2])) as typeof def;
  expect(daily({ menuPrices: up }).t).toBeCloseTo(40 * Math.pow(1.2, -2.1), 2);
});
test('평점 3.6이면 0.512배, 침체면 0.85배, 앱 광고면 배달 1.15배', () => {
  expect(daily({ ratings: { hall: 3.6, delivery: 3.6 } }).t).toBeCloseTo(40 * 0.512);
  expect(daily({ economy: { ...econ, cycle: 'recession' } }).t).toBeCloseTo(34);
  expect(daily({ levers: { ...off, appAds: true } }).d).toBeCloseTo(24 * 1.15);
});
test('처리 능력을 넘으면 배달부터 잃는다', () => {
  const s = serveHour(10, 10, 14); expect(s.servedHall + s.servedDelivery).toBe(16); expect(s.lost).toBe(4); expect(s.servedHall).toBe(10);
  expect(serveHour(5, 5, 14).waitDelivery).toBe(35);
});
test('평점은 만족도를 따라가고, 답글은 하락을 줄인다', () => {
  let a = { hall: 4.5, delivery: 4.5 }, b = { ...a };
  for (let i = 0; i < 50; i++) { a = updateRating(a, 'delivery', 2, off); b = updateRating(b, 'delivery', 2, { ...off, reviewReplies: true }); }
  expect(b.delivery).toBeGreaterThan(a.delivery); expect(a.delivery).toBeGreaterThan(2);
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: Commit** `feat: 시간대별 수요, 처리 능력, 만족도와 평점`

---

### Task 8: 운영 수단과 비용 미리보기

**Files:** Modify `src/sim/levers.ts` · Test `tests/sim/levers.test.ts`

**Interfaces:**
- Consumes: `LeverId`, `Levers`, `orderMix`, `unitCost`, `MENU`, balance 상수
- Produces:
  - `LEVERS: Record<LeverId, { name: string; description: string; effectHint: string }>` — 이름: 콜라 서비스, 프리미엄 치즈, 보온 포장, 리뷰 답글, 배달앱 광고. `effectHint`는 효과의 방향만, 숫자 없이(예: 「배달앱 평점에 도움이 될 수 있어요」, 리뷰 답글은 「사장님 손이 묶여 시간당 피자 1판을 덜 만들어요」).
  - `interface MarginCtx { prices: Record<IngredientId, number>; menuPrices: Record<MenuItemId, number>; inflation: number; levers: Levers; n: Neighborhood }`
  - `orderEconomics(ctx: MarginCtx, ch: 'hall'|'delivery'): { revenuePerOrder: number; variableCostPerOrder: number; marginRate: number }` — 주문 1건 = 피자 1판(orderMix 비율) + 콜라(확률 `COLA_ATTACH_RATE`). 배달 변동비 = 원가 + 매출×`APP_FEE_RATE` + `DELIVERY_FEE_OWNER` + (insulatedBox ? `INSULATED_BOX_COST`) + (freeCola ? cola500 가격). 프리미엄 치즈는 원가에 반영.
  - `interface LeverPreview { channel: 'hall'|'delivery'|'all'; perOrderCostDelta: number; weeklyFixedDelta: number; capacityDelta: number; marginBefore: number; marginAfter: number; marginDeltaPp: number; effectHint: string }`
  - `previewLever(ctx, id, turnOn: boolean): LeverPreview` — channel: freeCola·insulatedBox → delivery, premiumCheese → all(배달 비중 가중 평균), reviewReplies·appAds → all
  - `previewMenuPrice(ctx, item: MenuItemId, newPrice: number): { unitCost: number; unitMarginBefore: number; unitMarginAfter: number; costRateAfter: number; effectHint: string }` — 가격 민감도 ≥ 1.2인 동네에서 올리면 hint에 「이 동네 손님은 가격에 민감해요」

- [ ] **Step 1: 실패하는 테스트**

```ts
const ctx = (o: Partial<MarginCtx> = {}): MarginCtx => ({ prices: basePrices(), menuPrices: defaultMenuPrices(), inflation: 1, levers: allOff(), n: NEIGHBORHOODS.campus, ...o });
test('기본 조건 주문당 매출 22,125원', () => { expect(orderEconomics(ctx(), 'hall').revenuePerOrder).toBeCloseTo(22125, 0); });
test('콜라 서비스: 배달 주문당 +800원, 이익률 −3.6%p', () => {
  const p = previewLever(ctx(), 'freeCola', true);
  expect(p.channel).toBe('delivery'); expect(p.perOrderCostDelta).toBe(800); expect(p.marginDeltaPp).toBeCloseTo(-3.6, 1);
});
test('배달앱 광고는 고정비, 리뷰 답글은 처리 능력', () => {
  expect(previewLever(ctx(), 'appAds', true).weeklyFixedDelta).toBe(88000);
  expect(previewLever(ctx(), 'reviewReplies', true).capacityDelta).toBe(-1);
});
test('효과 문구에는 숫자가 없다', () => { for (const l of Object.values(LEVERS)) expect(l.effectHint).not.toMatch(/\d/); });
test('가격 미리보기', () => {
  const p = previewMenuPrice(ctx(), 'cheese', 19900);
  expect(p.unitMarginAfter - p.unitMarginBefore).toBe(1000); expect(p.effectHint).toContain('가격에 민감');
});
```
(`basePrices`, `defaultMenuPrices`, `allOff`는 `tests/sim/helpers.ts`에 모아 Task 6·7 테스트와 공유)

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: Commit** `feat: 운영 수단과 비용 미리보기`

---

### Task 9: 장부 · 게임 상태 · 새 게임 · 한 틱 진행

**Files:** Create `src/sim/ledger.ts`, `src/sim/types.ts`, `src/sim/newGame.ts`, `src/sim/tick.ts` · Test `tests/sim/tick.test.ts`, `tests/sim/ledger.test.ts`

**Interfaces:**
- Consumes: Task 1~8 전부
- Produces:
  - `ledger.ts`: `interface DayRecord { day; monthIndex; hallOrders; deliveryOrders; lostOrders; stockoutOrders; revenueHall; revenueDelivery; foodCost; serviceCost; wasteCost; labor; rent; appFees; deliveryFees; utilities; ads; purchases /*현금 지출, 이익 계산엔 안 들어감*/; usage: Usage }`, `interface MonthRecord` = DayRecord의 숫자 필드 합 + `monthIndex`, `interface Ledger { days: DayRecord[]; months: MonthRecord[] }`, `DAYS_KEEP = 112`, `emptyDay(day, monthIndex): DayRecord`, `closeDay(l, rec): Ledger`, `closeMonth(l, monthIndex): Ledger`, `profitOf(r: DayRecord | MonthRecord): number`(매출 − foodCost − serviceCost − wasteCost − labor − rent − appFees − deliveryFees − utilities − ads)
  - `types.ts`: `interface GameState { version: 1; seed: number; rngState: number; createdAt: number; shopName: string; neighborhoodId: NeighborhoodId; clock: Clock; cash: number; cashNegative: boolean; economy: Economy; prices: Record<IngredientId, number>; menuPrices: Record<MenuItemId, number>; levers: Levers; ratings: Ratings; inventory: Inventory; rules: Record<IngredientId, ReorderRule>; news: NewsState; ledger: Ledger; today: DayRecord; charge: ChargeState }`
  - `newGame.ts`: `createNewGame(o: { seed: number; neighborhoodId: NeighborhoodId; shopName: string; nowMs: number }): GameState`, `fallbackUsage(n: Neighborhood): Record<IngredientId, number>`(기본 주문 수 × 레시피 × baseMix로 계산한 하루 사용량)
  - `tick.ts`: `type PauseReason = { kind: 'news'; newsId: string } | { kind: 'monthEnd'; monthIndex: number } | { kind: 'cashNegative' } | { kind: 'outOfCharge' }`, `interface AnimEvents { hour: number; hallArrivals: number; deliveriesOut: number; pizzasBaked: number; lostOrders: number; revenue: number; weather: Weather; stockouts: IngredientId[] }`, `advanceTickInPlace(s: GameState): { pauses: PauseReason[]; anim: AnimEvents }`(s를 직접 바꿈, 긴 시뮬레이션 테스트용), `advanceTick(s: GameState): { state: GameState; pauses; anim }`(`structuredClone` 후 InPlace, 입력을 바꾸지 않음), `playTick(s, nowMs): { state; pauses; anim } | null`(충전 적립 → 1틱 소비 → advanceTick, 충전 없으면 null)
  - `tests/sim/helpers.ts`에 추가: `g()` = `createNewGame({ seed: 123, neighborhoodId: 'campus', shopName: '테스트 피자', nowMs: 0 })`, `midDay()` = `g()`를 12틱 진행해 `{ day: 1, hour: 12 }`에 둔 상태(개점 처리가 끝나 다음 몇 틱 동안 뉴스 멈춤이 없음, 충전은 77로 되돌림). UI 테스트도 이 도우미를 쓴다.

`createNewGame`: 현금 = `cashAfterSetup` → 첫 달 월세 즉시 → `fallbackUsage`로 자동 발주(목표치까지) 비용 차감. 첫 달 월세와 첫 발주는 `today`(0일 기록)의 `rent`·`purchases`에 적는다. 시계 `{0, 11}`, 평점 4.5/4.5, 기본 가격, 운영 수단 모두 끔, 규칙 `DEFAULT_RULES`, 충전 `{ ticks: 77, lastAccruedAt: nowMs }`, 개업 뉴스(announce, important) 「{shopName} 개업!」.

`advanceTick` 순서:
1. **개점(hour 11)**: 월요일이면 `stepEconomyWeek` → `planWeek`. `fireDue`. 7월 첫날 `announceMinWage`, 1월 첫날 `applyMinWage`. 날씨 굴림. 오늘 시세 = `ingredientPrice(…, shockMult = shockMultiplier(active), noise = 1 + normal(0, 0.02))`. `expire`(폐기 → wasteCost). 사용량 추정 → `autoReorder`(현금·purchases 차감). 달의 첫날(day>0)이면 월세. `dailyFlavor`.
2. **영업**: `expectedOrders` → 홀·배달 각각 `rng.poisson` → `serveHour`. 처리된 주문마다 피자를 `orderMix`로 뽑고 콜라는 확률로 붙임 → `canMake` 실패면 stockoutOrders(손님 잃음) → 성공이면 `consume`(foodCost), 배달은 수수료·배달비·보온 포장·콜라 서비스(cola500 재고 없으면 생략) 반영 → `satisfaction` → `updateRating`. 매출은 즉시 현금에.
3. **마감(hour 21)**: 인건비 `(STAFF_COUNT−1) × 11 × minWage × LABOR_OVERHEAD`, 공과금, 일요일이면 앱 광고비. `closeDay`. 달의 마지막 날이면 `closeMonth` + `monthEnd` 멈춤.
4. 이번 틱에 생긴 important 뉴스마다 `news` 멈춤. 현금이 0 아래로 처음 내려가면 `cashNegative` 멈춤(다시 0 이상이 되면 플래그 해제). `nextTick`.

- [ ] **Step 1: 실패하는 테스트**

```ts
// g, midDay는 tests/sim/helpers.ts
test('advanceTick은 입력을 바꾸지 않는다', () => { const s = g(); const before = JSON.stringify(s); advanceTick(s); expect(JSON.stringify(s)).toBe(before); });
test('77틱 = 1주', () => { let s = g(); for (let i = 0; i < 77; i++) s = advanceTick(s).state; expect(s.clock).toEqual({ day: 7, hour: 11 }); });
test('같은 seed면 300틱 뒤 똑같다', () => { let a = g(), b = g(); for (let i = 0; i < 300; i++) { a = advanceTick(a).state; b = advanceTick(b).state; } expect(a).toEqual(b); });
test('월세는 매달 첫날 한 번', () => {
  let s = g(); for (let i = 0; i < 28 * 11 * 2; i++) s = advanceTick(s).state;
  expect(s.ledger.months.map(m => m.rent)).toEqual([1_500_000, 1_500_000]);
});
test('monthEnd 멈춤은 28일에 한 번', () => {
  let s = g(), n = 0; for (let i = 0; i < 28 * 11 * 3; i++) { const r = advanceTick(s); s = r.state; n += r.pauses.filter(p => p.kind === 'monthEnd').length; }
  expect(n).toBe(3);
});
test('밸런스: 기본 운영 1년, 동네 3곳 × seed 5개의 월 이익 중앙값 300만~1,200만 원', () => {
  for (const id of ['campus', 'office', 'residential'] as const) {
    const profits: number[] = [];
    for (let seed = 1; seed <= 5; seed++) { const s = createNewGame({ seed, neighborhoodId: id, shopName: 't', nowMs: 0 }); for (let i = 0; i < 12 * 28 * 11; i++) advanceTickInPlace(s); profits.push(...s.ledger.months.map(profitOf)); }
    profits.sort((a, b) => a - b); const med = profits[Math.floor(profits.length / 2)];
    expect(med).toBeGreaterThan(3_000_000); expect(med).toBeLessThan(12_000_000);
  }
}, 120_000);
test('치즈 파동이 터지면 치즈 시세가 크게 오른다', () => {
  let s = g(); s.news.pending.push({ id: 'x', type: 'CHEESE_SHORTAGE', signalDay: 0, fireDay: 1, real: true, magnitude: 0.4 });
  for (let i = 0; i < 11; i++) s = advanceTick(s).state; const before = s.prices.mozzarella;
  for (let i = 0; i < 11; i++) s = advanceTick(s).state; expect(s.prices.mozzarella / before).toBeGreaterThan(1.25);
});
test('3년 플레이 후 저장 크기 1MB 미만', () => { const s = g(); for (let i = 0; i < 3 * 12 * 28 * 11; i++) advanceTickInPlace(s); expect(JSON.stringify(s).length).toBeLessThan(1_000_000); }, 120_000);
test('현금이 0 아래로 내려갈 때 한 번 멈춘다', () => {
  let s = g(); s.cash = 10_000; s.menuPrices = { cheese: 1000, pepperoni: 1000, combo: 1000, cola: 1000 };
  let n = 0; for (let i = 0; i < 11 * 5; i++) { const r = advanceTick(s); s = r.state; n += r.pauses.filter(p => p.kind === 'cashNegative').length; }
  expect(n).toBe(1);
});
test('playTick은 충전이 없으면 null', () => { const s = { ...g(), charge: { ticks: 0, lastAccruedAt: 0 } }; expect(playTick(s, 0)).toBeNull(); });
// ledger.test.ts
test('이익 계산은 현금 지출(purchases)을 빼지 않는다', () => {
  const r = { ...emptyDay(0, 0), revenueHall: 100_000, foodCost: 30_000, purchases: 500_000 }; expect(profitOf(r)).toBe(70_000);
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS** (밸런스 테스트가 실패하면 `balance.ts` 수치만 조정하고, 바꾼 값을 커밋 메시지에 적는다)
- [ ] **Step 5: Commit** `feat: 장부와 한 틱 진행, 새 게임`

---

### Task 10: 저장 · 불러오기 · 백업

**Files:** Create `src/sim/save.ts` · Test `tests/sim/save.test.ts`

`save.ts`는 Storage를 인자로 받으므로 sim 규칙(전역 localStorage 참조 금지)을 지킨다.

**Interfaces:**
- Produces: `SAVE_KEY = 'restaurant-tycoon/save/v1'`, `BACKUP_KEY = 'restaurant-tycoon/save/v1/bak'`, `interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void }`, `saveGame(s: GameState, st: StorageLike): { ok: true } | { ok: false; reason: 'quota' | 'unknown' }`(쓰기 전 기존 본 저장을 BACKUP_KEY로 복사, 예외는 잡아서 반환), `loadGame(st): GameState | null`(본 저장이 깨졌으면 백업, 둘 다 깨졌으면 null), `class SaveImportError extends Error`, `exportSave(s, nowMs): string`(`{ app: 'restaurant-tycoon', version: 1, exportedAt, state }`), `importSave(text: string): GameState`

- [ ] **Step 1: 실패하는 테스트**

```ts
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m }; };
test('저장 후 불러오면 같다', () => { const st = mem(); const s = g(); saveGame(s, st); expect(loadGame(st)).toEqual(s); });
test('본 저장이 깨지면 백업에서', () => { const st = mem(); const a = g(); saveGame(a, st); saveGame(advanceTick(a).state, st); st.m.set(SAVE_KEY, '{깨짐'); expect(loadGame(st)).toEqual(a); });
test('둘 다 깨지면 null', () => { const st = mem(); st.m.set(SAVE_KEY, 'x'); st.m.set(BACKUP_KEY, 'y'); expect(loadGame(st)).toBeNull(); });
test('용량 초과는 던지지 않고 알려 준다', () => {
  const st = { getItem: () => null, setItem: () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); } };
  expect(saveGame(g(), st)).toEqual({ ok: false, reason: 'quota' });
});
test('엉뚱한 파일은 한국어로 거절', () => {
  expect(() => importSave('{"hello":1}')).toThrow('이 게임의 저장 파일이 아니에요');
  expect(() => importSave('not json')).toThrow('이 게임의 저장 파일이 아니에요');
  expect(() => importSave(JSON.stringify({ app: 'restaurant-tycoon', version: 9, state: {} }))).toThrow('지원하지 않는 저장 버전이에요');
});
test('내보내기 → 가져오기 왕복', () => { const s = g(); expect(importSave(exportSave(s, 0))).toEqual(s); });
test('재생 중 닫았다 다시 열어도 충전이 두 번 쌓이지 않는다', () => {
  const st = mem(); const r = playTick(g(), 1000)!; saveGame(r.state, st);
  const back = loadGame(st)!; expect(accrueCharge(back.charge, 1000).ticks).toBeCloseTo(r.state.charge.ticks);
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: Commit** `feat: 저장, 백업 복구, 내보내기·가져오기`

---

### Task 11: 화면 뼈대와 새 게임 화면

**Files:** Create `src/ui/format.ts`, `src/ui/screens/NewGame.tsx`, `src/ui/styles.css` · Modify `src/ui/App.tsx` · Test `tests/ui/newgame.test.tsx`(`// @vitest-environment jsdom`), `tests/ui/format.test.ts`

**Interfaces:**
- Consumes: `NEIGHBORHOODS`, `cashAfterSetup`, `createNewGame`, `loadGame`, `saveGame`
- Produces: `won(n: number): string`, `manwon(n: number): string`, `pct(x: number, digits?: number): string`(0.433 → 「43.3%」), `pp(x: number): string`(−3.616 → 「−3.6%p」, 음수 기호는 U+2212, 양수는 「+」), `stars(r: number): string`(「★ 4.5」), `NewGame({ onStart }: { onStart: (o: { neighborhoodId: NeighborhoodId; shopName: string }) => void })`, `App()` — 시작 시 `loadGame(localStorage)`, 없으면 NewGame, 있으면 Main(Task 12)

NewGame 화면: 가게 이름 입력(기본값 「우리 동네 피자」, 1~12자), 동네 카드 3장(썸네일 자리, 이름, 성격 3줄, 보증금·권리금·월세, 「개업 후 남는 돈」), 카드마다 「여기서 개업」 버튼(44px 이상). 아이패드 가로면 카드 3장 가로, 세로면 세로 쌓기. 색은 `:root` 토큰(토마토 빨강·크림·올리브·나무색), 글꼴은 시스템 글꼴.

- [ ] **Step 1: 실패하는 테스트**

```ts
test('돈 표기', () => { expect(won(1234000)).toBe('1,234,000원'); expect(won(-500)).toBe('-500원'); expect(manwon(20_000_000)).toBe('2,000만 원'); });
test('비율 표기', () => { expect(pct(0.433)).toBe('43.3%'); expect(pp(-3.616)).toBe('−3.6%p'); expect(pp(1.25)).toBe('+1.3%p'); });
test('동네 카드 3장과 개업', async () => {
  const onStart = vi.fn(); render(<NewGame onStart={onStart} />);
  expect(screen.getByText('대학가 「새내기길」')).toBeTruthy(); expect(screen.getAllByRole('button', { name: '여기서 개업' })).toHaveLength(3);
  fireEvent.click(screen.getAllByRole('button', { name: '여기서 개업' })[2]);
  expect(onStart).toHaveBeenCalledWith({ neighborhoodId: 'residential', shopName: '우리 동네 피자' });
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: Commit** `feat: 새 게임 화면`

---

### Task 12: 메인 화면 · 재생 · 멈춤 창

**Files:** Create `src/ui/hooks/usePlayback.ts`, `src/ui/screens/Main.tsx`, `src/ui/components/PlaybackBar.tsx`, `src/ui/components/PauseModal.tsx` · Test `tests/ui/playback.test.tsx`

**Interfaces:**
- Consumes: `playTick`, `saveGame`, `formatClock`, `formatCharge`, `won`
- Produces: `MS_PER_TICK = 1948`, `usePlayback(initial: GameState, o: { now: () => number; persist: (s: GameState) => void }): { state: GameState; playing: boolean; speed: 1 | 2 | 4; setSpeed(v: 1 | 2 | 4): void; play(): void; stop(): void; lastAnim: AnimEvents | null; pauses: PauseReason[]; dismissPause(): void; update(fn: (s: GameState) => GameState): void }`, `Main({ initial }: { initial: GameState })`

동작: `play()` 하면 `MS_PER_TICK / speed`마다 `playTick(state, now())`. 배속을 바꾸면 타이머를 새 간격으로 다시 건다. null이면 멈추고 `outOfCharge`를 쌓음. 결과마다 `persist`. 멈춤 사유가 있으면 멈추고 창을 띄운다. 창을 다 닫았을 때 자동 멈춤 전에 재생 중이었으면 다시 재생. `document.visibilitychange`로 숨겨지면 멈추고 저장. `update`(패널의 결정)도 저장.
Main 배치: 가로 = 왼쪽 60% 가게 장면 + 재생 막대, 오른쪽 40% 탭 패널 · 세로 = 위 45% 장면 + 막대, 아래 패널. 이 Task에서는 장면·패널 자리에 빈 영역만 두고 Task 13·14가 채운다.
PlaybackBar: 재생/멈춤(56px), 배속 1×·2×·4×, 「남은 영업 5일 3시간」, `formatClock`, 날씨, 현금(바뀔 때 숫자가 0.6초 동안 올라가는 효과).
PauseModal: news → 헤드라인·본문·「확인」(signal이면 「재고·발주 보기」 버튼도), monthEnd → 이번 달 매출·이익·지난달 대비 + 「장부 보기」, cashNegative → 「통장이 마이너스예요」 안내, outOfCharge → 「오늘 충전된 시간을 다 썼어요. 내일 다시 와 주세요」 + 다음 충전까지 남은 현실 시간.

- [ ] **Step 1: 실패하는 테스트** (`vi.useFakeTimers()`)

```ts
test('1×에서 1,948ms마다 1틱, 4×면 487ms', () => {
  const { result } = renderHook(() => usePlayback(midDay(), { now: () => 0, persist: () => {} }));
  act(() => result.current.play()); act(() => { vi.advanceTimersByTime(1948); }); expect(result.current.state.clock.hour).toBe(13);
  act(() => result.current.setSpeed(4)); act(() => { vi.advanceTimersByTime(487); }); expect(result.current.state.clock.hour).toBe(14);
});
test('충전이 떨어지면 멈추고 안내', () => {
  const s = { ...midDay(), charge: { ticks: 1, lastAccruedAt: 0 } }; render(<Main initial={s} />);
  fireEvent.click(screen.getByRole('button', { name: '재생' })); act(() => { vi.advanceTimersByTime(1948 * 2); });
  expect(screen.getByText(/오늘 충전된 시간을 다 썼어요/)).toBeTruthy();
});
test('중요 뉴스면 멈추고, 창을 다 닫으면 이어서 재생', () => {
  const s = midDay(); s.news.pending.push({ id: 'p', type: 'FESTIVAL', signalDay: 0, fireDay: 2, real: true, magnitude: 0.6 });
  const { result } = renderHook(() => usePlayback(s, { now: () => 0, persist: () => {} }));
  act(() => result.current.play()); act(() => { vi.advanceTimersByTime(1948 * 11); });
  expect(result.current.playing).toBe(false); expect(result.current.pauses[0].kind).toBe('news');
  for (let i = 0; i < 5 && result.current.pauses.length; i++) act(() => result.current.dismissPause());
  expect(result.current.playing).toBe(true);
});
test('화면이 숨겨지면 멈추고 저장', () => {
  const persist = vi.fn(); const { result } = renderHook(() => usePlayback(midDay(), { now: () => 0, persist }));
  act(() => result.current.play()); Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); }); expect(result.current.playing).toBe(false); expect(persist).toHaveBeenCalled();
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: Commit** `feat: 메인 화면과 재생`

---

### Task 13: 패널 여섯 개

**Files:** Create `src/ui/panels/StatusPanel.tsx`, `NewsPanel.tsx`, `MenuPanel.tsx`, `InventoryPanel.tsx`, `LeversPanel.tsx`, `LedgerPanel.tsx` · Modify `src/ui/screens/Main.tsx`(탭 연결) · Test `tests/ui/panels.test.tsx`

**Interfaces:**
- Consumes: `GameState`, `update(fn)`, `previewLever`, `previewMenuPrice`, `orderEconomics`, `manualBuyDays`, `stockOf`, `dailyUsageEstimate`, `profitOf`, `clampMenuPrice`, `LEVERS`, `won`, `pct`, `stars`
- Produces: 패널마다 `({ state, update }: { state: GameState; update: (fn: (s: GameState) => GameState) => void }) => JSX.Element`

| 탭 | 보여 줄 것 | 할 수 있는 것 |
|---|---|---|
| 현황 | 오늘 홀·배달 주문, 놓친 주문(처리 능력 초과 / 재료 부족 따로), 홀 평점·배달앱 평점, 진행 중 사건(치즈 파동 등) 칩, 최근 7일 매출 꺾은선(인라인 SVG) | — |
| 뉴스 | 최신순 목록, 「신호」「발생」「빗나감」 배지, 좋은 소식·나쁜 소식 색 구분 | 중요 뉴스만 보기 |
| 메뉴·가격 | 메뉴별 가격·원가·원가율·한 판 이익 | ±500원 버튼(접근성 이름 「{메뉴 이름} 500원 내리기/올리기」) → `previewMenuPrice` 카드 → 「적용」(clampMenuPrice 통과) |
| 재고·발주 | 재료별 재고(「n일치」), 오늘 시세와 7일 전 대비 ▲▼%, 이번 달 폐기 금액 | 발주 기준·목표 일수 ±1, 재료마다 7·30·60일치 미리 사기 버튼(접근성 이름 「{재료 이름} {n}일치 미리 사기」) → 비용 미리보기 카드(창고 상한이면 「창고가 꽉 차서 n일치까지만 살 수 있어요」) → 「구매 확정」 |
| 운영 수단 | 수단별 켜짐 여부 | 누르면 `previewLever` 카드(대학가 기본 조건 예: 「주문당 원가 +800원 → 배달 이익률 43.3% → 39.7% (−3.6%p)」 + effectHint) → 「켜기/끄기 확정」 |
| 장부 | 이번 달(오늘까지)과 지난달들 손익표: 매출(홀/배달), 재료비, 서비스 비용, 폐기, 인건비, 월세, 배달앱 수수료, 배달비, 공과금, 광고비, 이익 | 아래에 한 줄: 「장부상 이익과 통장 잔고는 달라요. 재료를 미리 사면 돈은 먼저 나가지만, 비용은 쓸 때 잡혀요.」 |

- [ ] **Step 1: 실패하는 테스트**

```ts
test('가격을 내려도 1,000원 아래로는 안 간다', () => {
  let s = g(); s.menuPrices.cola = 1000; const update = (fn: any) => { s = fn(s); };
  const { rerender } = render(<MenuPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '콜라 1.25L 500원 내리기' })); fireEvent.click(screen.getByRole('button', { name: '적용' }));
  rerender(<MenuPanel state={s} update={update} />); expect(s.menuPrices.cola).toBe(1000);
});
test('콜라 서비스 미리보기 문구', () => {
  render(<LeversPanel state={g()} update={() => {}} />); fireEvent.click(screen.getByRole('button', { name: /콜라 서비스/ }));
  expect(screen.getByText(/−3\.6%p/)).toBeTruthy(); expect(screen.getByText(/주문당 원가 \+800원/)).toBeTruthy();
});
test('미리 사기는 현금을 줄이고 상한이면 안내', () => {
  let s = g(); const cash0 = s.cash; const update = (fn: any) => { s = fn(s); };
  render(<InventoryPanel state={s} update={update} />);
  fireEvent.click(screen.getByRole('button', { name: '모짜렐라 치즈 60일치 미리 사기' }));
  expect(screen.getByText(/창고가 꽉 차서/)).toBeTruthy(); fireEvent.click(screen.getByRole('button', { name: '구매 확정' }));
  expect(s.cash).toBeLessThan(cash0);
});
test('장부에 이익이 원화로', () => {
  let s = g(); for (let i = 0; i < 28 * 11; i++) s = advanceTick(s).state;
  render(<LedgerPanel state={s} update={() => {}} />); expect(screen.getAllByText(/[\d,]+원/).length).toBeGreaterThan(5);
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: Commit** `feat: 현황·뉴스·메뉴·재고·운영 수단·장부 패널`

---

### Task 14: 가게 장면 애니메이션

**Files:** Create `src/ui/components/ShopScene.tsx`, `src/ui/sceneLayout.ts`, `src/ui/scene.css` · Modify `src/ui/screens/Main.tsx` · Test `tests/ui/scene.test.tsx`

**Interfaces:**
- Consumes: `AnimEvents`, `Weather`, `ActiveShock`
- Produces: `interface SceneAssets { background: string; customers: string[]; rider: string; pizza: string }`, `SCENE_ASSETS: SceneAssets`(Task 15 전에는 빈 문자열), `SCENE_LAYOUT = { door: {x, y}, counter: {x, y}, oven: {x, y}, exit: {x, y} }`(장면 대비 %), `ShopScene({ anim, hour, weather, mood }: { anim: AnimEvents | null; hour: number; weather: Weather; mood: 'normal' | 'crisis' | 'opportunity' })`, `moodOf(active: ActiveShock[], cycle: Cycle): 'normal'|'crisis'|'opportunity'`

동작(anim이 바뀔 때마다):
- 손님: `min(hallArrivals, 6)`명, 150ms 간격으로 문 → 카운터 1.2초 이동 후 사라짐. 손님 그림은 `customers` 중 무작위.
- 배달: `min(deliveriesOut, 4)`대, 주방 → 오른쪽 끝 1.5초.
- 피자: `min(pizzasBaked, 5)`판, 100ms 간격으로 오븐 자리에서 크기 0.6 → 1.1 → 1(0.4초) 뒤 1초 머물다 사라짐.
- 매출: 「+123,000원」 떠오르며 1.2초에 사라짐 · 놓친 주문이 있으면 빨간 「놓친 주문 n건」.
- 시간대 빛: 11–16시 없음, 17–18시 `rgba(255,150,50,.12)`, 19–21시 `rgba(20,40,120,.25)`.
- 날씨: rain 빗줄기(CSS 반복 그라데이션 애니메이션), cold 눈송이 점, heat 따뜻한 막.
- 분위기: crisis(나쁜 active 충격 또는 침체) 빨간 테두리 그늘, opportunity(좋은 active 충격 또는 호황) 금빛.
- 동시에 떠 있는 그림 최대 20개. `prefers-reduced-motion`이면 이동 없이 숫자만(`window.matchMedia`가 없는 환경이면 움직임 있음으로 본다). 언마운트하면 타이머 정리.
- 그림이 없거나 못 불러오면 같은 자리에 단색 2D 둥근 상자(3D·도형 조합 그림 금지).

- [ ] **Step 1: 실패하는 테스트**

```ts
const anim = (o = {}) => ({ hour: 12, hallArrivals: 3, deliveriesOut: 2, pizzasBaked: 4, lostOrders: 0, revenue: 123000, weather: 'sunny', stockouts: [], ...o }) as AnimEvents;
test('손님 3명·배달 2대·피자 4판', () => {
  vi.useFakeTimers(); const { container } = render(<ShopScene anim={anim()} hour={12} weather="sunny" mood="normal" />);
  act(() => { vi.advanceTimersByTime(500); });
  expect(container.querySelectorAll('[data-sprite="customer"]').length).toBe(3);
  expect(container.querySelectorAll('[data-sprite="rider"]').length).toBe(2);
  expect(container.querySelectorAll('[data-sprite="pizza"]').length).toBe(4);
  expect(screen.getByText('+123,000원')).toBeTruthy();
});
test('손님이 50명이어도 6명까지만', () => {
  vi.useFakeTimers(); const { container } = render(<ShopScene anim={anim({ hallArrivals: 50 })} hour={12} weather="sunny" mood="normal" />);
  act(() => { vi.advanceTimersByTime(2000); }); expect(container.querySelectorAll('[data-sprite="customer"]').length).toBeLessThanOrEqual(6);
});
test('움직임 줄이기 설정이면 그림 없이 숫자만', () => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }) as any;
  const { container } = render(<ShopScene anim={anim()} hour={12} weather="sunny" mood="normal" />);
  expect(container.querySelectorAll('[data-sprite]').length).toBe(0); expect(screen.getByText('+123,000원')).toBeTruthy();
});
test('분위기 판정', () => {
  expect(moodOf([{ type: 'CHEESE_SHORTAGE', untilDay: 9, magnitude: .4 }], 'normal')).toBe('crisis');
  expect(moodOf([{ type: 'FESTIVAL', untilDay: 9, magnitude: .6 }], 'normal')).toBe('opportunity');
  expect(moodOf([], 'recession')).toBe('crisis');
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: 브라우저 미리보기(`.claude/launch.json`에 `npm run dev`, 포트 5173)로 1180×820에서 재생해 손님·배달·피자가 움직이는지 스크린샷 확인**
- [ ] **Step 6: Commit** `feat: 가게 장면 애니메이션`

---

### Task 15: Higgsfield 소재 만들기와 연결

**Files:** Create `scripts/compress-assets.mjs`, `public/assets/*.webp`, `public/icons/*.png` · Modify `src/ui/sceneLayout.ts`(SCENE_ASSETS, SCENE_LAYOUT 좌표), `src/ui/screens/NewGame.tsx`(동네 썸네일)

| 소재 | 개수 | 비율 | 배경 제거 | 최종 크기 |
|---|---|---|---|---|
| 가게 내부 배경(쿼터뷰, 왼쪽 카운터·뒤쪽 화덕 오븐·테이블 4개·오른쪽 문, 사람·글자 없음) | 1 | 16:10 | | 가로 1600 |
| 손님(대학생, 직장인, 아이와 부모, 어르신 — 전신, 옆모습으로 걷는 자세) | 4 | 3:4 | ✓ | 세로 400 |
| 배달 기사와 오토바이(옆모습) | 1 | 4:3 | ✓ | 가로 400 |
| 갓 구운 피자(위에서 본 모습) | 1 | 1:1 | ✓ | 256 |
| 동네 썸네일(대학가, 오피스 상권, 주택가 골목) | 3 | 16:9 | | 가로 600 |
| 앱 아이콘(피자 + 작은 장부) | 1 | 1:1 | | 512 / 192 / 180 |

공통 문체 앞말: 「따뜻하고 아늑한 평면 2D 일러스트, 부드러운 음영, 한국 동네 피자집, 토마토 빨강·크림·올리브 초록·나무색 팔레트, 같은 화풍」. 모델이 참조 이미지를 받으면 배경 그림을 참조로 넣어 화풍을 맞춘다.

- [ ] **Step 1: Higgsfield `balance`로 남은 크레딧, `models_explore`로 이미지 모델과 장당 크레딧 확인**
- [ ] **Step 2: 위 표 + 예상 크레딧을 사용자에게 보여 주고 승인을 받는다. 승인 전에는 생성하지 않는다.**
- [ ] **Step 3: 생성 → 스프라이트 6장 `remove_background` → 결과를 눈으로 확인(화풍이 튀거나 글자가 들어간 것은 다시 생성, 다시 생성도 크레딧이 들면 먼저 알림)**
- [ ] **Step 4: 내려받아 `node scripts/compress-assets.mjs <입력폴더>`로 WebP 변환(sharp, 품질 82), 아이콘은 PNG**
- [ ] **Step 5: `SCENE_ASSETS` 경로 연결, 배경 그림을 보고 `SCENE_LAYOUT`의 문·카운터·오븐·출구 좌표를 맞춘다**
- [ ] **Step 6: 미리보기 1180×820·820×1180에서 재생 스크린샷 → 손님이 문에서 카운터로, 오토바이가 밖으로, 피자가 오븐에서 나오는지 확인**
- [ ] **Step 7: Commit** `feat: Higgsfield 그림 소재 연결`

---

### Task 16: 아이패드 마무리 · 홈 화면 앱 · 백업 메뉴 · 배포

**Files:** Create `src/ui/components/SettingsMenu.tsx`, `.github/workflows/pages.yml` · Modify `vite.config.ts`(vite-plugin-pwa), `index.html`, `src/ui/styles.css`, `src/ui/App.tsx` · Test `tests/ui/settings.test.tsx`

**Interfaces:**
- Consumes: `exportSave`, `importSave`, `SaveImportError`, `GameState`
- Produces: `SettingsMenu({ state, onReplace, onReset }: { state: GameState; onReplace: (s: GameState) => void; onReset: () => void })` — 파일 입력의 label은 「저장 파일 불러오기」

- PWA: 이름 「피자집 경영」(가제, 사용자가 이름을 정하면 바꿈), `display: standalone`, `orientation: any`, 아이콘 Task 15, `registerType: 'autoUpdate'`, 소재 전부 미리 캐시(오프라인 실행).
- `index.html`: `apple-mobile-web-app-capable`, `apple-touch-icon`(180), `viewport-fit=cover`. CSS: 안전 영역 여백, `touch-action: manipulation`, 바깥 스크롤 튕김 막기.
- 시작 시 `navigator.storage.persist()` 요청(지원할 때만).
- SettingsMenu(톱니 버튼): 「저장 파일 내보내기」(`restaurant-tycoon-save-YYYYMMDD.json` 내려받기), 「저장 파일 불러오기」(파일 선택 → `importSave`, 실패하면 오류 문구 그대로 표시), 「처음부터 다시」(확인 창 2번).
- 저장 실패(`reason: 'quota'`)면 화면 위에 「저장 공간이 부족해요. 저장 파일을 내보내 두세요」 띠.

- [ ] **Step 1: 실패하는 테스트**

```ts
test('엉뚱한 파일을 불러오면 오류 문구', async () => {
  render(<SettingsMenu state={g()} onReplace={() => {}} onReset={() => {}} />); fireEvent.click(screen.getByRole('button', { name: '설정' }));
  const file = new File(['{"hello":1}'], 'x.json', { type: 'application/json' });
  fireEvent.change(screen.getByLabelText('저장 파일 불러오기'), { target: { files: [file] } });
  expect(await screen.findByText('이 게임의 저장 파일이 아니에요')).toBeTruthy();
});
test('처음부터 다시는 확인 두 번', () => {
  const onReset = vi.fn(); window.confirm = vi.fn().mockReturnValue(true);
  render(<SettingsMenu state={g()} onReplace={() => {}} onReset={onReset} />); fireEvent.click(screen.getByRole('button', { name: '설정' }));
  fireEvent.click(screen.getByRole('button', { name: '처음부터 다시' })); expect(window.confirm).toHaveBeenCalledTimes(2); expect(onReset).toHaveBeenCalled();
});
```

- [ ] **Step 2: FAIL → Step 3: 구현 → Step 4: PASS**
- [ ] **Step 5: 미리보기에서 1180×820·820×1180 둘 다 확인, 모든 버튼이 44px 이상인지 `javascript_tool`로 `getBoundingClientRect` 검사, 콘솔 오류 0**
- [ ] **Step 6: `npm test` 전체 PASS, `npm run build` 통과**
- [ ] **Step 7: Commit** `feat: 아이패드 홈 화면 앱, 백업 메뉴`
- [ ] **Step 8: 배포 전 사용자에게 확인: GitHub 계정 tony-cho0514에 공개 저장소 `restaurant-tycoon`을 만들고 GitHub Pages로 올려도 되는지.** 승인되면 `pages.yml`(main 푸시 → `GITHUB_PAGES=1 npm run build` → Pages 배포)로 올리고, 주소와 「사파리 공유 버튼 → 홈 화면에 추가」 안내를 전달한다. 거절하면 다른 올릴 곳을 사용자와 정한다.

---

## 2부 예고 (별도 계획)

직원 채용·면접(숨은 성향), 알바 배치 규칙, 가게 단위 위기·기회, 부검 리포트, 경영 개념 도감, 힌트 줄이기, 폐업·재시작. 1부가 끝나고 실제로 며칠 해 본 뒤 감을 반영해 쓴다.
