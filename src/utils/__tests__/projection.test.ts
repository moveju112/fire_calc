// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { calcProjection, calcAllAccountsProjection } from '../projection'
import type { Account } from '../../types'

const singleStockAccount: Account = {
  type: 'domestic',
  totalAmount: 100_000_000,
  stocks: [
    {
      id: '1',
      name: 'KODEX200',
      allocation: 100,
      annualGrowth: 10,
      dividendYield: 2,
      dividendGrowth: 5,
      dividendFrequency: 1 as const,  // 연배당: 기존 테스트와 동일 조건
    },
  ],
}

describe('calcProjection', () => {
  it('1년 후 자산은 성장률만큼 증가', () => {
    const result = calcProjection(singleStockAccount)
    expect(result[0].year).toBe(1)
    expect(result[0].totalAsset).toBeCloseTo(110_000_000, -3)
  })

  it('10개 연도 반환', () => {
    const result = calcProjection(singleStockAccount)
    expect(result).toHaveLength(20)
    expect(result[19].year).toBe(20)
  })

  it('1년 후 세전 배당은 구현된 유효 배당률 식을 따른다', () => {
    const result = calcProjection(singleStockAccount)
    // 1년 후 자산 × [현재 배당률 × ((1+배당성장률)/(1+주가성장률))^1]
    const expected = 110_000_000 * 0.02 * Math.pow((1 + 0.05) / (1 + 0.10), 1)
    expect(result[0].dividendBeforeTax).toBeCloseTo(expected, 0)
  })

  it('세후 배당 < 세전 배당 (국내투자 15.4%)', () => {
    const result = calcProjection(singleStockAccount)
    expect(result[0].dividendAfterTax).toBeLessThan(result[0].dividendBeforeTax)
  })

  it('비중 0인 종목은 자산 0', () => {
    const account: Account = {
      ...singleStockAccount,
      stocks: [{ ...singleStockAccount.stocks[0], allocation: 0 }],
    }
    const result = calcProjection(account)
    expect(result[0].totalAsset).toBe(0)
  })

  it('연도별 계산 근거 데이터를 포함한다', () => {
    const result = calcProjection(singleStockAccount)
    expect(result[0].detail?.startAsset).toBeCloseTo(100_000_000, -3)
    expect(result[0].detail?.taxAmount).toBeCloseTo(
      result[0].dividendBeforeTax - result[0].dividendAfterTax,
      3
    )
    expect(result[0].detail?.yearlyDividendBeforeTax).toBeCloseTo(result[0].dividendBeforeTax, 3)
    expect(result[0].detail?.monthlyGrowthCount).toBe(12)
  })
})

describe('calcAllAccountsProjection', () => {
  it('두 계좌의 합산 자산을 반환', () => {
    const accounts = [singleStockAccount, singleStockAccount]
    const result = calcAllAccountsProjection(accounts)
    const single = calcProjection(singleStockAccount)
    expect(result[0].totalAsset).toBeCloseTo(single[0].totalAsset * 2, -3)
  })

  it('10개 연도 반환', () => {
    const result = calcAllAccountsProjection([singleStockAccount])
    expect(result).toHaveLength(20)
  })
})
