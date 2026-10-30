# 확장 Implementation Plan (1차·2차)

> Executed inline (superpowers:executing-plans). Ledger: `.superpowers/sdd/2026-10-30-expansion/progress.md`.

**Goal:** 주문 기록·매출 숫자·운영시간·현실 비용 요소·일괄 발주(1차)와 배달 구역·새 메뉴·알바 채용·단체 주문·가게 업그레이드(2차)를 더한다.
**Spec:** `docs/superpowers/specs/2026-10-30-expansion-design.md` (+ 원 설계)
**Branch:** `first-shop-part1` 위에 이어서 커밋, 1차·2차 끝마다 `npm run deploy`.

## Global Constraints
- 원 계획의 전역 규칙 그대로(한국어 문구, 원화 표기, 아이패드 44px, sim 순수·결정적, 밸런스 수치는 `balance.ts`, 커밋 끝 Co-Authored-By).
- 저장 형식 `version: 2`. `migrate(v1) → v2`는 기본값을 채운다. `SAVE_KEY`는 그대로 쓴다(`…/v1` 키 이름 유지, 안의 version이 2).
- 기존 테스트는 계속 통과해야 한다. 기본 설정(11~22시, 휴무 없음, 배달팁 1,000원, 알바 1명 종일)에서 밸런스 테스트(월 이익 중앙값 300만~1,200만 원)가 유지되게 `balance.ts`만 조정한다.

## 1차

### A1. 저장 v2 + 운영 설정
- `types.ts`: `GameState.version: 2`, `settings: { openHour: number; closeHour: number; closedDay: number | null; deliveryTip: number }`(기본 11, 22, null, 1000), `orders: OrderRecord[]`.
- `save.ts`: `migrate(raw)` — version 1이면 settings·orders 기본값을 넣고 version 2로. `hasGameShape`는 v2 필드도 본다. 내보내기 파일 `version: 2`, 가져오기는 1·2 둘 다 받는다(1이면 migrate).
- 테스트: v1 저장 문자열을 불러오면 version 2·기본 settings로 열림 / v1 내보내기 파일 가져오기 OK.

### A2. 운영시간·휴무
- `time.ts`: `nextTick(c, settings?)` — 닫는 시각에 다음 날 여는 시각으로. 상수 `TICKS_PER_DAY`(11)는 「표준 하루」로 충전에만 쓴다.
- 손님 곡선을 24시간 배열로(`hourCurve24`, 0~23시). 10~23시 값만 0이 아니다. 기존 11~21시 값은 그대로 두어 기본 설정의 하루 손님 수가 변하지 않게 한다. 10시·22·23시: 대학가 .3/.9/.7, 오피스 .3/.1/0, 주택가 .2/.5/.3(배달 위주는 곡선 아닌 배달 비중으로 이미 반영).
- 하루 기본 주문 수는 「11~21시 곡선 합」 기준으로 계산(`baseDailyOrders × curve[h] / sum(11..21)`) — 시간을 늘리면 손님이 그만큼 더 온다.
- 충전: 한 틱이 쓰는 충전 = `TICKS_PER_DAY / 영업시간 수`. 휴무일은 개점 때 바로 다음 날로 넘어가고 충전을 쓰지 않는다(그날 기록은 매출 0으로 남김, 월세는 기존 규칙대로).
- 공과금 `UTILITIES_PER_HOUR = 2,730`(11시간 ≈ 30,000).
- 테스트: 10~24시면 하루 14틱·하루 주문이 11~22시보다 많다 / 휴무 요일엔 주문 0·인건비 0·충전 차감 0 / 영업시간을 바꿔도 하루 충전 소비는 11.

### A3. 주문 기록
- `OrderRecord { day; hour; channel: 'hall'|'delivery'|'group'; items: { menu: MenuItemId; qty: number }[]; amount: number; zone?: string }`. 주문마다 push, 7일 지난 것은 하루 마감 때 버린다.
- 헬퍼 `ordersOn(state, day)`, `hourlyRevenue(orders, day)`, `dailySummary(ledgerDays)`.
- 테스트: 하루 영업 후 기록 수 = 홀+배달 주문 수, 금액 합 = 매출 / 8일 지나면 첫날 기록이 없다.

### A4. 현실 비용
- 홀 카드 수수료 `CARD_FEE_RATE = 0.015` → `DayRecord.cardFees`(장부·이익에 반영).
- 배달비: `DELIVERY_COST_TOTAL = 4000`, 사장 몫 = 4000 − 배달팁. 배달 수요 × `(1 − 0.08 × (tip − 1000)/1000)`(기본 1,000원이면 1). 배달팁은 0~4,000원 500원 단위.
- 인건비(직원 시스템 전 임시): 알바 1명이 연 시간 내내 근무. 하루 인건비 = 시급 × 시간 × (1 + 0.09) + 주 15시간 이상이면 주휴(하루 몫 = 시간 × 시급 × 1/5 ... 주 단위 대신 일 단위 근사: 시간 × 시급 × 0.2). `LABOR_OVERHEAD` 제거.
- 테스트: 홀 매출의 1.5%가 cardFees / 배달팁 2,000원이면 사장 배달비 2,000원·배달 주문 감소 / 인건비 공식.

### A5. 재고 개선
- `manualBuyUnits(inv, id, qty, prices, today, capUnits)` 추가. 창고 상한(개수) = `max(storageMaxDays × 하루 사용량, MIN_STORAGE[id])`.
- `buyCart(state, items: {id; mode: 'days'|'units'; qty}[])` → 한 번에 구매, 합계 반환.
- 하루 사용량이 0이면 미리보기가 「n일치」 대신 개수.
- `recipeLines(menuId, prices, premiumCheese)` → `{ ingredient, qty, unit, cost }[]`.
- 테스트: 콜라 서비스를 꺼 둔 상태에서 cola500 24병 사면 0원이 아니다 / 장바구니 3종 합계 = 각각 합 / recipeLines 합 + 기타 = unitCost.

### A6. 화면(1차)
- 탭 9개(두 줄 5+4). 「직원」 탭은 2차 전까지 「알바 1명(종일)·시급」만 보여 줌.
- 매출·주문 탭: 날짜 고르기(오늘·어제·최근 7일), 시간대별 매출 표, 7일 표(날짜·주문 수·매출·객단가), 주문 목록(시각·종류·메뉴·금액·구역), 홀/배달 필터.
- 메뉴 탭: 메뉴마다 「재료 보기」 펼치기.
- 재고 탭: 재료마다 체크 + 수량(일치 또는 개수) → 아래 장바구니 합계 → 「한 번에 발주」.
- 가게 탭: 운영시간(여는·닫는 시각 ± 버튼), 정기 휴무(없음/월~일), 배달팁(± 500원) — 바꾸면 미리보기(하루 인건비·공과금 변화).
- 장부: 카드 수수료 줄 추가.
- 배포.

## 2차

### B1. 배달 구역
- `neighborhoods.ts`에 `zones: { id; name; share; extraMin }[]`. 배달 주문마다 구역을 뽑고, 대기 시간 = 기존 + extraMin(오토바이 업그레이드만큼 감소).
- `zoneStats(orders)` → 구역별 주문 수·매출·평균 배달 시간.
- 테스트: 구역 비중 합 1 / 먼 구역 만족도 낮음 / 통계 합 = 배달 주문.

### B2. 새 메뉴
- 재료: potato(감자 kg 3,000 국산 계절), bulgogi(불고기 kg 18,000 국산), sweetPotato(고구마무스 kg 8,000 국산), pineapple(파인애플 kg 7,000 수입), ham(햄 kg 11,000 수입).
- 메뉴: potato 22,900 / bulgogi 23,900 / goguma 22,900 / hawaiian 21,900. 개발비 `MENU_DEV_COST = 300,000`. `menuActive: Record<MenuItemId, boolean>`.
- 동네 선호 `prefs: Partial<Record<PizzaId, number>>`(곱). 활성 피자 수가 3보다 많으면 하루 손님 × (1 + 0.03×(n−3)), 최대 1.12.
- 테스트: 개발하면 메뉴 활성·현금 차감 / 주택가에서 고구마 비중 > 하와이안 / 비활성 메뉴는 안 팔림.

### B3. 직원
- `Staff { id; name; age; wage; shift: 'lunch'|'dinner'|'full'; traits: { speed; kindness; diligence; quitRisk } (0~1); revealed: Partial<Record<trait, true>>; daysWorked }`.
- 처리 능력/시간 = 사장 7 + Σ(근무 중 알바 5 + 4×speed) − 리뷰 답글 1, 오븐 상한.
- 홀 만족도 + 0.2×(평균 kindness − 0.5). diligence 낮으면 하루 결근 확률(0.05×(1−d)).
- 성향 공개: 7일 speed, 14일 kindness, 21일 diligence.
- 채용: 공고 → 다음 개점에 지원자 2~4명(뉴스 멈춤) → 면접 질문 4개 중 2개 → 답(성향 단서, 20% 오차) → 채용. 내보내기.
- 그만두기: 매주 확률 = quitRisk×0.05 + (시급 < 최저+500이면 0.05) + (종일·주 6일 이상이면 0.03).
- 새해 최저임금 인상 시 낮은 시급 자동 인상.
- 테스트: 알바 2명이면 처리 능력 증가 / 근무 시간 밖엔 인건비 없음 / 최저임금 미만 시급 거부 / 14일 뒤 kindness 공개.

### B4. 단체 주문
- 동네별 제안 확률·요일·시간대·판 수 범위·제목 틀. 제안은 뉴스처럼 멈춤 → 수락/거절(만료일).
- 수락한 주문은 해당 시각 틱에서 먼저 처리: 재료·처리 능력 차감, 다 만들면 금액(할인 반영) + 평점 +0.05, 부족하면 만든 만큼만 받고 평점 −0.2.
- 테스트: 수락→해당 시각 매출 기록(channel group) / 재료 부족이면 평점 하락 / 거절은 아무 일 없음.

### B5. 업그레이드
- `upgrades: Record<UpgradeId, number>`; 표: tables(1→3: 식탁 4→5→6, 2,000,000/2,500,000), oven(1→3: 상한 16→24→32, 5,000,000/8,000,000), storage(1→3: ×1.5/×2, 1,500,000/3,000,000), interior(1→3: 홀 만족 +0.1/+0.2, 4,000,000/7,000,000), sign(1→2: 홀 손님 ×1.1, 2,000,000), bike(0→2: 배달 −5/−10분, 1,800,000/1,800,000).
- 홀 좌석 = 식탁×2, 시간당 홀 손님 상한 = 좌석×1.5. 넘친 홀 손님은 「자리 없음」으로 놓침.
- 가게 등급 = Σ레벨, 2호점 준비도 = 등급 / 최대 등급.
- 테스트: 식탁 레벨이 오르면 홀 상한 증가 / 오븐 레벨 상한 / 비용 차감·최대 레벨에서 더 못 삼.

### B6. 화면(2차)·3D
- 직원 탭(목록·공고·면접·내보내기·근무 시간), 가게 탭 업그레이드 목록, 단체 주문 창, 매출·주문 탭 구역 통계, 메뉴 개발 목록.
- 3D: 식탁 수 = 업그레이드, 오븐 2단계 이상이면 레인지 하나 더, 카운터 뒤 직원 수 = 근무 중 인원(최대 3).
- 배포.
