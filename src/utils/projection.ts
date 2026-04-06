import type { Account, YearlyProjection } from '../types'
import { calcAfterTax } from './taxCalc'

export function calcProjection(account: Account): YearlyProjection[] {
  const results: YearlyProjection[] = []

  for (let year = 1; year <= 10; year++) {
    let totalAsset = 0
    let dividendBeforeTax = 0

    for (const stock of account.stocks) {
      const initialAmount = account.totalAmount * (stock.allocation / 100)
      const assetAtYear = initialAmount * Math.pow(1 + stock.annualGrowth / 100, year)
      const dividend =
        assetAtYear *
        (stock.dividendYield / 100) *
        Math.pow(1 + stock.dividendGrowth / 100, year)

      totalAsset += assetAtYear
      dividendBeforeTax += dividend
    }

    const dividendAfterTax = calcAfterTax(account.type, dividendBeforeTax)

    results.push({ year, totalAsset, dividendBeforeTax, dividendAfterTax })
  }

  return results
}

export function calcAllAccountsProjection(accounts: Account[]): YearlyProjection[] {
  const combined: YearlyProjection[] = Array.from({ length: 10 }, (_, i) => ({
    year: i + 1,
    totalAsset: 0,
    dividendBeforeTax: 0,
    dividendAfterTax: 0,
  }))

  for (const account of accounts) {
    const projections = calcProjection(account)
    projections.forEach((p, i) => {
      combined[i].totalAsset += p.totalAsset
      combined[i].dividendBeforeTax += p.dividendBeforeTax
      combined[i].dividendAfterTax += p.dividendAfterTax
    })
  }

  return combined
}
