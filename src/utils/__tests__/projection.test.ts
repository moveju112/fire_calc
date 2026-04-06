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
    expect(result).toHaveLength(10)
    expect(result[9].year).toBe(10)
  })

  it('1년 후 세전 배당 = 자산 × 배당률 × 배당성장률', () => {
    const result = calcProjection(singleStockAccount)
    // 1년 후 자산 110,000,000 × 2% × (1+5%)^1
    const expected = 110_000_000 * 0.02 * Math.pow(1.05, 1)
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
    expect(result).toHaveLength(10)
  })
})
