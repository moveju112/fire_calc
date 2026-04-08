import type { Account, MonthlyContribution, YearlyProjection } from '../types'
import { calcAfterTax, calcIsaAfterTaxIncremental } from './taxCalc'

function shouldPayThisMonth(frequency: 1 | 4 | 12, month: number): boolean {
  if (frequency === 12) return true
  if (frequency === 4) return month % 3 === 0
  return month === 12
}

/**
 * 비율 배분 목록을 받아 실제 적용할 가중치 Map을 반환.
 * - 비율 합 > 100%: 비례 축소하여 합이 정확히 100%가 되도록 정규화
 * - 비율 합 <= 100%: 그대로 사용 (미배분은 투자 안 함으로 허용)
 */
function buildWeightMap(
  allocations: Array<{ stockId: string; ratio: number }>,
  balances: Map<string, number>
): Map<string, number> {
  const valid = allocations.filter((a) => a.stockId && balances.has(a.stockId) && a.ratio > 0)
  const totalRatio = valid.reduce((s, a) => s + a.ratio, 0)
  const scale = totalRatio > 100 ? 100 / totalRatio : 1
  const map = new Map<string, number>()
  for (const a of valid) {
    map.set(a.stockId, (a.ratio * scale) / 100)
  }
  return map
}

type SimOptions = {
  years: number
  yearOffset: number  // FIRE 시뮬레이션에서 dividendGrowth 기준 연차를 보정
  initialBalances: Map<string, number>
  contribution?: MonthlyContribution
  enableReinvest: boolean
}

function runAccountSimulation(
  account: Account,
  options: SimOptions
): { projections: YearlyProjection[]; finalBalances: Map<string, number> } {
  const results: YearlyProjection[] = []
  const balances = new Map(options.initialBalances)

  // 납입 배분 가중치 (비율 합 초과 방지)
  const contribWeights = options.contribution
    ? buildWeightMap(options.contribution.allocations, balances)
    : new Map<string, number>()

  // 재투자 배분 가중치 (비율 합 초과 방지)
  const reinvestWeights = options.enableReinvest && account.reinvestAllocations?.length
    ? buildWeightMap(account.reinvestAllocations, balances)
    : new Map<string, number>()

  for (let year = 1; year <= options.years; year++) {
    // dividendGrowth 계산에 사용할 절대 연차 (FIRE 이후 구간 왜곡 방지)
    const absYear = options.yearOffset + year

    let yearDividendBeforeTax = 0
    let yearDividendAfterTax = 0
    let isaYearCumulative = 0

    for (let month = 1; month <= 12; month++) {
      // 1) 월 납입
      if (options.contribution && options.contribution.monthlyAmount > 0) {
        for (const [stockId, weight] of contribWeights) {
          balances.set(stockId, (balances.get(stockId) ?? 0) + options.contribution.monthlyAmount * weight)
        }
      }

      // 2) 성장
      for (const stock of account.stocks) {
        const prev = balances.get(stock.id) ?? 0
        balances.set(stock.id, prev * Math.pow(1 + stock.annualGrowth / 100, 1 / 12))
      }

      // 3) 배당
      let monthPaymentBefore = 0
      for (const stock of account.stocks) {
        const freq = stock.dividendFrequency ?? 4
        if (!shouldPayThisMonth(freq, month)) continue
        const balance = balances.get(stock.id) ?? 0
        // absYear 로 dividendGrowth 적용 → FIRE 이후도 올바른 성장률 반영
        const effectiveYield = (stock.dividendYield / 100) * Math.pow(1 + stock.dividendGrowth / 100, absYear)
        monthPaymentBefore += balance * (effectiveYield / freq)
      }

      if (monthPaymentBefore <= 0) continue

      // 4) 세후
      let monthPaymentAfter: number
      if (account.type === 'isa') {
        monthPaymentAfter = calcIsaAfterTaxIncremental(monthPaymentBefore, isaYearCumulative)
        isaYearCumulative += monthPaymentBefore
      } else {
        monthPaymentAfter = calcAfterTax(account.type, monthPaymentBefore)
      }

      yearDividendBeforeTax += monthPaymentBefore
      yearDividendAfterTax += monthPaymentAfter

      // 5) 재투자 (비율 합 초과 방지 가중치 사용)
      if (reinvestWeights.size > 0) {
        for (const [stockId, weight] of reinvestWeights) {
          balances.set(stockId, (balances.get(stockId) ?? 0) + monthPaymentAfter * weight)
        }
      }
    }

    let totalAsset = 0
    for (const b of balances.values()) totalAsset += b

    results.push({ year, totalAsset, dividendBeforeTax: yearDividendBeforeTax, dividendAfterTax: yearDividendAfterTax })
  }

  return { projections: results, finalBalances: balances }
}

export function calcProjection(account: Account, contribution?: MonthlyContribution): YearlyProjection[] {
  const initialBalances = new Map(account.stocks.map((s) => [s.id, account.totalAmount * (s.allocation / 100)]))
  return runAccountSimulation(account, {
    years: 10,
    yearOffset: 0,
    initialBalances,
    contribution,
    enableReinvest: true,
  }).projections
}

export function calcAllAccountsProjection(
  accounts: Account[],
  contributions?: Record<string, MonthlyContribution>
): YearlyProjection[] {
  const combined: YearlyProjection[] = Array.from({ length: 10 }, (_, i) => ({
    year: i + 1, totalAsset: 0, dividendBeforeTax: 0, dividendAfterTax: 0,
  }))
  for (const account of accounts) {
    const contribution = contributions?.[account.type]
    calcProjection(account, contribution).forEach((p, i) => {
      combined[i].totalAsset += p.totalAsset
      combined[i].dividendBeforeTax += p.dividendBeforeTax
      combined[i].dividendAfterTax += p.dividendAfterTax
    })
  }
  return combined
}

/**
 * FIRE 시뮬레이션.
 * - pre: 1~fireYear 정상 시뮬레이션 (납입·재투자 포함)
 * - post: FIRE 이후 postFireYears 동안 납입·재투자 중단
 *   → yearOffset = fireYear 으로 dividendGrowth 연차 보정
 */
export function calcFireSimProjection(
  accounts: Account[],
  contributions: Record<string, MonthlyContribution>,
  fireYear: number,
  postFireYears = 20
): { pre: YearlyProjection[]; post: YearlyProjection[] } {
  const preCombined: YearlyProjection[] = Array.from({ length: fireYear }, (_, i) => ({
    year: i + 1, totalAsset: 0, dividendBeforeTax: 0, dividendAfterTax: 0,
  }))
  const postCombined: YearlyProjection[] = Array.from({ length: postFireYears }, (_, i) => ({
    year: fireYear + i + 1, totalAsset: 0, dividendBeforeTax: 0, dividendAfterTax: 0,
  }))

  for (const account of accounts) {
    const contribution = contributions[account.type]
    const initialBalances = new Map(account.stocks.map((s) => [s.id, account.totalAmount * (s.allocation / 100)]))

    // Phase 1: 정상 시뮬레이션 (yearOffset=0)
    const { projections: pre, finalBalances } = runAccountSimulation(account, {
      years: fireYear,
      yearOffset: 0,
      initialBalances,
      contribution,
      enableReinvest: true,
    })

    // Phase 2: 납입·재투자 없이 (yearOffset=fireYear 로 dividendGrowth 연속성 보장)
    const { projections: post } = runAccountSimulation(account, {
      years: postFireYears,
      yearOffset: fireYear,
      initialBalances: finalBalances,
      contribution: undefined,
      enableReinvest: false,
    })

    pre.forEach((p, i) => {
      preCombined[i].totalAsset += p.totalAsset
      preCombined[i].dividendBeforeTax += p.dividendBeforeTax
      preCombined[i].dividendAfterTax += p.dividendAfterTax
    })
    post.forEach((p, i) => {
      postCombined[i].totalAsset += p.totalAsset
      postCombined[i].dividendBeforeTax += p.dividendBeforeTax
      postCombined[i].dividendAfterTax += p.dividendAfterTax
    })
  }

  return { pre: preCombined, post: postCombined }
}
