import type {
  Account,
  ConversionStrategy,
  MonthlyContribution,
  ProjectionDetail,
  YearlyProjection,
} from '../types'
import { calcAfterTax, calcReinvestAmount, calcIsaAfterTaxIncremental } from './taxCalc'

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
  includeConversion?: boolean
}

function createEmptyProjectionDetail(): ProjectionDetail {
  return {
    startAsset: 0,
    yearlyContribution: 0,
    growthAmount: 0,
    reinvestAmount: 0,
    taxAmount: 0,
    conversionAmount: 0,
    conversionSourceCount: 0,
    conversionApplied: false,
    monthlyContributionCount: 0,
    monthlyGrowthCount: 0,
    paymentCount: 0,
    monthlyDividendBeforeTax: 0,
    quarterlyDividendBeforeTax: 0,
    yearlyDividendBeforeTax: 0,
    monthlyDividendAfterTax: 0,
    quarterlyDividendAfterTax: 0,
    yearlyDividendAfterTax: 0,
  }
}

function getActiveConversionStrategy(account: Account, includeConversion?: boolean): ConversionStrategy | null {
  if (!includeConversion) return null

  const strategy = account.conversionStrategy
  if (!strategy?.enabled) return null
  if (strategy.conversionYear < 1) return null
  if (strategy.sellRatio <= 0) return null

  const validSourceStockIds = strategy.sourceStockIds.filter((stockId) =>
    account.stocks.some((stock) => stock.id === stockId)
  )
  const validAllocations = strategy.allocations.filter(
    (allocation) => allocation.ratio > 0 && account.stocks.some((stock) => stock.id === allocation.stockId)
  )

  if (validSourceStockIds.length === 0 || validAllocations.length === 0) {
    return null
  }

  return {
    ...strategy,
    sourceStockIds: validSourceStockIds,
    allocations: validAllocations,
  }
}

export function hasActiveConversionStrategy(account: Account): boolean {
  return getActiveConversionStrategy(account, true) !== null
}

export function hasAnyActiveConversionStrategy(accounts: Account[]): boolean {
  return accounts.some((account) => hasActiveConversionStrategy(account))
}

function applyConversionStrategyIfNeeded(
  account: Account,
  balances: Map<string, number>,
  detail: ProjectionDetail,
  year: number,
  includeConversion?: boolean
) {
  const strategy = getActiveConversionStrategy(account, includeConversion)
  if (!strategy || strategy.conversionYear !== year || detail.conversionApplied) return

  const targetWeights = buildWeightMap(strategy.allocations, balances)
  if (targetWeights.size === 0) return

  const sellMultiplier = Math.min(strategy.sellRatio, 100) / 100
  let totalConvertedAmount = 0
  let conversionSourceCount = 0

  for (const stockId of strategy.sourceStockIds) {
    const currentBalance = balances.get(stockId) ?? 0
    if (currentBalance <= 0) continue
    const sellAmount = currentBalance * sellMultiplier
    if (sellAmount <= 0) continue
    balances.set(stockId, currentBalance - sellAmount)
    totalConvertedAmount += sellAmount
    conversionSourceCount += 1
  }

  if (totalConvertedAmount <= 0) return

  for (const [stockId, weight] of targetWeights) {
    balances.set(stockId, (balances.get(stockId) ?? 0) + totalConvertedAmount * weight)
  }

  detail.conversionApplied = true
  detail.conversionAmount = totalConvertedAmount
  detail.conversionSourceCount = conversionSourceCount
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
    let startAsset = 0
    for (const balance of balances.values()) startAsset += balance

    // dividendGrowth 계산에 사용할 절대 연차 (FIRE 이후 구간 왜곡 방지)
    const absYear = options.yearOffset + year

    let yearDividendBeforeTax = 0
    let yearDividendAfterTax = 0
    let isaYearCumulative = 0
    let yearlyContribution = 0
    let yearlyGrowthAmount = 0
    let yearlyReinvestAmount = 0
    let monthlyContributionCount = 0
    let paymentCount = 0
    let monthlyDividendBeforeTax = 0
    let quarterlyDividendBeforeTax = 0
    let yearlyDividendBeforeTaxByFrequency = 0
    let monthlyDividendAfterTax = 0
    let quarterlyDividendAfterTax = 0
    let yearlyDividendAfterTaxByFrequency = 0
    const detail = createEmptyProjectionDetail()

    applyConversionStrategyIfNeeded(account, balances, detail, year, options.includeConversion)

    for (let month = 1; month <= 12; month++) {
      // 1) 월 납입
      if (options.contribution && options.contribution.monthlyAmount > 0) {
        let monthContributionApplied = false
        for (const [stockId, weight] of contribWeights) {
          const contributionAmount = options.contribution.monthlyAmount * weight
          balances.set(stockId, (balances.get(stockId) ?? 0) + contributionAmount)
          yearlyContribution += contributionAmount
          if (contributionAmount > 0) monthContributionApplied = true
        }
        if (monthContributionApplied) monthlyContributionCount += 1
      }

      // 2) 성장
      for (const stock of account.stocks) {
        const prev = balances.get(stock.id) ?? 0
        const next = prev * Math.pow(1 + stock.annualGrowth / 100, 1 / 12)
        balances.set(stock.id, next)
        yearlyGrowthAmount += next - prev
      }

      // 3) 배당
      let monthPaymentBefore = 0
      let monthPaymentBeforeMonthly = 0
      let monthPaymentBeforeQuarterly = 0
      let monthPaymentBeforeYearly = 0
      for (const stock of account.stocks) {
        const freq = stock.dividendFrequency ?? 12
        if (!shouldPayThisMonth(freq, month)) continue
        const balance = balances.get(stock.id) ?? 0
        // absYear 로 dividendGrowth 적용 → FIRE 이후도 올바른 성장률 반영
        // dividendGrowth > 0: "주당 배당금" 성장률 → 현재가 기준 배당률 = yield × ((1+dg)/(1+pg))^year
        // dividendGrowth = 0: 현재가 대비 고정 배당률 (커버드콜 등) → yield 그대로
        const effectiveYield = stock.dividendGrowth === 0
          ? stock.dividendYield / 100
          : (stock.dividendYield / 100) * Math.pow((1 + stock.dividendGrowth / 100) / (1 + stock.annualGrowth / 100), absYear)
        const payment = balance * (effectiveYield / freq)
        monthPaymentBefore += payment
        if (freq === 12) monthPaymentBeforeMonthly += payment
        else if (freq === 4) monthPaymentBeforeQuarterly += payment
        else monthPaymentBeforeYearly += payment
      }

      if (monthPaymentBefore <= 0) continue

      // 4) 세후 계산 (표시용 / 재투자용 분리)
      let monthPaymentAfter: number   // 표시용: 인출 시 실제 받을 금액
      let monthReinvestAmount: number // 재투자용: 과세이연 계좌는 세전 전액

      if (account.type === 'isa') {
        monthPaymentAfter = calcIsaAfterTaxIncremental(monthPaymentBefore, isaYearCumulative)
        isaYearCumulative += monthPaymentBefore
        monthReinvestAmount = monthPaymentAfter
      } else {
        monthPaymentAfter = calcAfterTax(account.type, monthPaymentBefore)
        // IRP·연금저축: 과세이연 → 운용 중 전액 재투자, 인출 시에만 3.3%
        monthReinvestAmount = calcReinvestAmount(account.type, monthPaymentBefore)
      }

      yearDividendBeforeTax += monthPaymentBefore
      yearDividendAfterTax += monthPaymentAfter
      paymentCount += 1
      monthlyDividendBeforeTax += monthPaymentBeforeMonthly
      quarterlyDividendBeforeTax += monthPaymentBeforeQuarterly
      yearlyDividendBeforeTaxByFrequency += monthPaymentBeforeYearly

      const monthTaxRate = monthPaymentBefore > 0 ? monthPaymentAfter / monthPaymentBefore : 0
      monthlyDividendAfterTax += monthPaymentBeforeMonthly * monthTaxRate
      quarterlyDividendAfterTax += monthPaymentBeforeQuarterly * monthTaxRate
      yearlyDividendAfterTaxByFrequency += monthPaymentBeforeYearly * monthTaxRate

      // 5) 재투자 (과세이연 계좌는 세전 전액 재투자)
      if (reinvestWeights.size > 0) {
        for (const [stockId, weight] of reinvestWeights) {
          const reinvestAmount = monthReinvestAmount * weight
          balances.set(stockId, (balances.get(stockId) ?? 0) + reinvestAmount)
          yearlyReinvestAmount += reinvestAmount
        }
      }
    }

    let totalAsset = 0
    for (const b of balances.values()) totalAsset += b

    detail.startAsset = startAsset
    detail.yearlyContribution = yearlyContribution
    detail.growthAmount = yearlyGrowthAmount
    detail.reinvestAmount = yearlyReinvestAmount
    detail.taxAmount = yearDividendBeforeTax - yearDividendAfterTax
    detail.monthlyContributionCount = monthlyContributionCount
    detail.monthlyGrowthCount = 12
    detail.paymentCount = paymentCount
    detail.monthlyDividendBeforeTax = monthlyDividendBeforeTax
    detail.quarterlyDividendBeforeTax = quarterlyDividendBeforeTax
    detail.yearlyDividendBeforeTax = yearlyDividendBeforeTaxByFrequency
    detail.monthlyDividendAfterTax = monthlyDividendAfterTax
    detail.quarterlyDividendAfterTax = quarterlyDividendAfterTax
    detail.yearlyDividendAfterTax = yearlyDividendAfterTaxByFrequency

    results.push({
      year,
      totalAsset,
      dividendBeforeTax: yearDividendBeforeTax,
      dividendAfterTax: yearDividendAfterTax,
      detail,
    })
  }

  return { projections: results, finalBalances: balances }
}

export function calcProjection(
  account: Account,
  contribution?: MonthlyContribution,
  options?: { includeConversion?: boolean }
): YearlyProjection[] {
  const initialBalances = new Map(account.stocks.map((s) => [s.id, account.totalAmount * (s.allocation / 100)]))
  return runAccountSimulation(account, {
    years: 20,
    yearOffset: 0,
    initialBalances,
    contribution,
    enableReinvest: true,
    includeConversion: options?.includeConversion,
  }).projections
}

export function calcAllAccountsProjection(
  accounts: Account[],
  contributions?: Record<string, MonthlyContribution>,
  options?: { includeConversion?: boolean }
): YearlyProjection[] {
  const combined: YearlyProjection[] = Array.from({ length: 20 }, (_, i) => ({
    year: i + 1,
    totalAsset: 0,
    dividendBeforeTax: 0,
    dividendAfterTax: 0,
    detail: createEmptyProjectionDetail(),
  }))
  for (const account of accounts) {
    const contribution = contributions?.[account.type]
    calcProjection(account, contribution, options).forEach((p, i) => {
      combined[i].totalAsset += p.totalAsset
      combined[i].dividendBeforeTax += p.dividendBeforeTax
      combined[i].dividendAfterTax += p.dividendAfterTax
      if (p.detail && combined[i].detail) {
        combined[i].detail.startAsset += p.detail.startAsset
        combined[i].detail.yearlyContribution += p.detail.yearlyContribution
        combined[i].detail.growthAmount += p.detail.growthAmount
        combined[i].detail.reinvestAmount += p.detail.reinvestAmount
        combined[i].detail.taxAmount += p.detail.taxAmount
        combined[i].detail.conversionAmount += p.detail.conversionAmount
        combined[i].detail.conversionSourceCount += p.detail.conversionSourceCount
        combined[i].detail.conversionApplied = combined[i].detail.conversionApplied || p.detail.conversionApplied
        combined[i].detail.monthlyContributionCount += p.detail.monthlyContributionCount
        combined[i].detail.monthlyGrowthCount += p.detail.monthlyGrowthCount
        combined[i].detail.paymentCount += p.detail.paymentCount
        combined[i].detail.monthlyDividendBeforeTax += p.detail.monthlyDividendBeforeTax
        combined[i].detail.quarterlyDividendBeforeTax += p.detail.quarterlyDividendBeforeTax
        combined[i].detail.yearlyDividendBeforeTax += p.detail.yearlyDividendBeforeTax
        combined[i].detail.monthlyDividendAfterTax += p.detail.monthlyDividendAfterTax
        combined[i].detail.quarterlyDividendAfterTax += p.detail.quarterlyDividendAfterTax
        combined[i].detail.yearlyDividendAfterTax += p.detail.yearlyDividendAfterTax
      }
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
  postFireYears = 20,
  options?: { includeConversion?: boolean }
): { pre: YearlyProjection[]; post: YearlyProjection[] } {
  const preCombined: YearlyProjection[] = Array.from({ length: fireYear }, (_, i) => ({
    year: i + 1,
    totalAsset: 0,
    dividendBeforeTax: 0,
    dividendAfterTax: 0,
    detail: createEmptyProjectionDetail(),
  }))
  const postCombined: YearlyProjection[] = Array.from({ length: postFireYears }, (_, i) => ({
    year: fireYear + i + 1,
    totalAsset: 0,
    dividendBeforeTax: 0,
    dividendAfterTax: 0,
    detail: createEmptyProjectionDetail(),
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
      includeConversion: options?.includeConversion,
    })

    // Phase 2: 납입·재투자 없이 (yearOffset=fireYear 로 dividendGrowth 연속성 보장)
    const { projections: post } = runAccountSimulation(account, {
      years: postFireYears,
      yearOffset: fireYear,
      initialBalances: finalBalances,
      contribution: undefined,
      enableReinvest: false,
      includeConversion: options?.includeConversion,
    })

    pre.forEach((p, i) => {
      preCombined[i].totalAsset += p.totalAsset
      preCombined[i].dividendBeforeTax += p.dividendBeforeTax
      preCombined[i].dividendAfterTax += p.dividendAfterTax
      if (p.detail && preCombined[i].detail) {
        preCombined[i].detail.startAsset += p.detail.startAsset
        preCombined[i].detail.yearlyContribution += p.detail.yearlyContribution
        preCombined[i].detail.growthAmount += p.detail.growthAmount
        preCombined[i].detail.reinvestAmount += p.detail.reinvestAmount
        preCombined[i].detail.taxAmount += p.detail.taxAmount
        preCombined[i].detail.conversionAmount += p.detail.conversionAmount
        preCombined[i].detail.conversionSourceCount += p.detail.conversionSourceCount
        preCombined[i].detail.conversionApplied = preCombined[i].detail.conversionApplied || p.detail.conversionApplied
        preCombined[i].detail.monthlyContributionCount += p.detail.monthlyContributionCount
        preCombined[i].detail.monthlyGrowthCount += p.detail.monthlyGrowthCount
        preCombined[i].detail.paymentCount += p.detail.paymentCount
        preCombined[i].detail.monthlyDividendBeforeTax += p.detail.monthlyDividendBeforeTax
        preCombined[i].detail.quarterlyDividendBeforeTax += p.detail.quarterlyDividendBeforeTax
        preCombined[i].detail.yearlyDividendBeforeTax += p.detail.yearlyDividendBeforeTax
        preCombined[i].detail.monthlyDividendAfterTax += p.detail.monthlyDividendAfterTax
        preCombined[i].detail.quarterlyDividendAfterTax += p.detail.quarterlyDividendAfterTax
        preCombined[i].detail.yearlyDividendAfterTax += p.detail.yearlyDividendAfterTax
      }
    })
    post.forEach((p, i) => {
      postCombined[i].totalAsset += p.totalAsset
      postCombined[i].dividendBeforeTax += p.dividendBeforeTax
      postCombined[i].dividendAfterTax += p.dividendAfterTax
      if (p.detail && postCombined[i].detail) {
        postCombined[i].detail.startAsset += p.detail.startAsset
        postCombined[i].detail.yearlyContribution += p.detail.yearlyContribution
        postCombined[i].detail.growthAmount += p.detail.growthAmount
        postCombined[i].detail.reinvestAmount += p.detail.reinvestAmount
        postCombined[i].detail.taxAmount += p.detail.taxAmount
        postCombined[i].detail.conversionAmount += p.detail.conversionAmount
        postCombined[i].detail.conversionSourceCount += p.detail.conversionSourceCount
        postCombined[i].detail.conversionApplied = postCombined[i].detail.conversionApplied || p.detail.conversionApplied
        postCombined[i].detail.monthlyContributionCount += p.detail.monthlyContributionCount
        postCombined[i].detail.monthlyGrowthCount += p.detail.monthlyGrowthCount
        postCombined[i].detail.paymentCount += p.detail.paymentCount
        postCombined[i].detail.monthlyDividendBeforeTax += p.detail.monthlyDividendBeforeTax
        postCombined[i].detail.quarterlyDividendBeforeTax += p.detail.quarterlyDividendBeforeTax
        postCombined[i].detail.yearlyDividendBeforeTax += p.detail.yearlyDividendBeforeTax
        postCombined[i].detail.monthlyDividendAfterTax += p.detail.monthlyDividendAfterTax
        postCombined[i].detail.quarterlyDividendAfterTax += p.detail.quarterlyDividendAfterTax
        postCombined[i].detail.yearlyDividendAfterTax += p.detail.yearlyDividendAfterTax
      }
    })
  }

  return { pre: preCombined, post: postCombined }
}
