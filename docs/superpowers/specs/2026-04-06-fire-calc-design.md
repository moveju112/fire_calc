# FIRE 계산기 웹앱 설계 문서

**날짜:** 2026-04-06  
**프로젝트:** fire_calc

---

## 개요

주식 포트폴리오를 계좌별로 관리하고, 10년 예측 및 FIRE 달성 시점을 계산하는 정적 웹 앱.  
React + Vite로 빌드하여 nginx 서빙 및 더블클릭 실행 둘 다 지원.

---

## 기술 스택

- **프레임워크:** React 18 + TypeScript
- **빌드 도구:** Vite (`base: './'` 설정으로 더블클릭 실행 지원)
- **상태 관리:** Zustand (전역 상태 + localStorage 자동 동기화)
- **차트:** Recharts
- **스타일:** Tailwind CSS
- **서빙:** nginx (정적 파일 서빙)
- **데이터 저장:** localStorage (브라우저 로컬)

---

## 프로젝트 구조

```
fire_calc/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx       # 앱 헤더
│   │   │   └── TabNav.tsx       # 상단 탭 네비게이션
│   │   ├── portfolio/
│   │   │   ├── AccountTab.tsx   # 계좌별 입력 공통 컴포넌트
│   │   │   └── StockRow.tsx     # 종목 한 행 입력 컴포넌트
│   │   ├── projection/
│   │   │   ├── ProjectionTable.tsx  # 1~10년 예측 테이블
│   │   │   └── ProjectionChart.tsx  # Recharts 라인 차트
│   │   └── fire/
│   │       └── FireCalculator.tsx   # FIRE 목표 입력 + 달성 시점
│   ├── store/
│   │   └── portfolioStore.ts    # Zustand 스토어 (localStorage 연동)
│   ├── utils/
│   │   ├── taxCalc.ts           # 계좌별 세후 배당 계산
│   │   └── projection.ts        # 1~10년 자산/배당 예측 계산
│   ├── types/
│   │   └── index.ts             # 공통 타입 정의
│   └── App.tsx
├── vite.config.ts
├── tailwind.config.ts
├── nginx.conf
└── package.json
```

---

## 데이터 모델

```ts
type AccountType = 'isa' | 'pension' | 'irp' | 'overseas' | 'domestic'

type Stock = {
  id: string
  name: string            // 종목명 (예: QQQ)
  allocation: number      // 비중 (%, 0~100)
  annualGrowth: number    // 연간 성장률 (%)
  dividendYield: number   // 배당률 (%)
  dividendGrowth: number  // 배당 성장률 (%)
}

type Account = {
  type: AccountType
  totalAmount: number     // 총액 (원)
  stocks: Stock[]
}

type FireTarget = {
  targetAsset: number           // 목표 총자산 (원)
  targetMonthlyExpense: number  // 목표 월 지출 (원)
}

type AppState = {
  accounts: Record<AccountType, Account>
  fireTarget: FireTarget
}
```

---

## 탭 구성

```
[ISA] [연금저축] [IRP] [해외직투] [국내투자]  |  [예측 분석] [FIRE 계산]
```

왼쪽 5개: 계좌별 포트폴리오 입력  
오른쪽 2개: 분석 및 FIRE 계산

---

## 계좌 입력 탭 (AccountTab)

- 총액 입력 필드 (원 단위, 숫자 포맷팅)
- 종목 추가 버튼
- 종목 행 테이블:

| 종목명 | 비중(%) | 금액(자동) | 연간성장률(%) | 배당률(%) | 배당성장률(%) | 삭제 |
|--------|---------|-----------|-------------|---------|-------------|------|

- 비중 합계 실시간 표시, 100% 초과 시 경고
- 금액 = 총액 × 비중 / 100 (자동 계산, 읽기 전용)

---

## 예측 분석 탭

- 상단 토글: `계좌별 보기` / `전체 합계`
- 계좌별 보기 시: 계좌 선택 드롭다운
- 테이블:

| 연도 | 총자산 | 세전 연간 배당 | 세후 연간 배당 |
|------|--------|-------------|-------------|
| 1년 후 | ... | ... | ... |
| ... | | | |
| 10년 후 | ... | ... | ... |

- 하단 Recharts 라인 차트:
  - X축: 연도 (현재~10년 후)
  - Y축: 금액
  - 라인 1: 총자산
  - 라인 2: 세후 연간 배당

---

## FIRE 계산 탭

- 목표 총자산 입력
- 목표 월 지출 입력 → 4% 룰 기반 필요 자산 자동 표시 (월 지출 × 12 / 0.04)
- 현재 전체 자산 기준으로 FIRE 달성 예상 연도 하이라이트
- 현재 자산 / 목표 자산 진행률 표시

---

## 계산 로직

### 연도별 예측 (projection.ts)

```
for year in 1..10:
  for each stock in account:
    stock_asset[year] = stock_asset[year-1] × (1 + annualGrowth/100)
    stock_dividend_before_tax[year] = stock_asset[year] × (dividendYield/100)
                                      × (1 + dividendGrowth/100)^year
    stock_dividend_after_tax[year] = stock_dividend_before_tax[year]
                                     × (1 - taxRate(accountType))
  account_total[year] = sum(stock_asset[year])
```

### 계좌별 세율 (taxCalc.ts)

| 계좌 | 세율 적용 방식 |
|------|--------------|
| ISA | 비과세 (연 200만원 한도), 초과분 9.9% |
| 연금저축 | 수령 시 3.3~5.5% (기본 3.3% 적용) |
| IRP | 수령 시 3.3~5.5% (기본 3.3% 적용) |
| 해외직투 | 15% |
| 국내투자 | 15.4% |

### FIRE 달성 시점

```
required_asset = max(targetAsset, targetMonthlyExpense × 12 / 0.04)
fire_year = 첫 번째 year where total_asset[year] >= required_asset
```

---

## localStorage 동기화

- Zustand의 `persist` 미들웨어 사용
- 키: `fire-calc-state`
- 앱 로드 시 자동 복원, 상태 변경 시 자동 저장

---

## nginx 설정

```nginx
server {
  listen 80;
  root /var/www/fire_calc;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## 확장성 고려 사항

- `AccountType`에 새 계좌 추가 시 타입과 세율 함수만 수정
- 새 탭(기능) 추가 시 `TabNav`에 항목 추가 + 새 컴포넌트 작성
- `utils/` 내 계산 로직은 UI와 완전 분리되어 단독 테스트 가능
- 향후 백엔드 연동 시 localStorage → API 호출로 `portfolioStore.ts`만 수정
