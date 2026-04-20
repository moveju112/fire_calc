// src/types/index.ts

export type AccountType = 'isa' | 'pension' | 'irp' | 'overseas' | 'domestic'

export const ACCOUNT_LABELS: Record<AccountType, string> = {
  isa: 'ISA',
  pension: '연금저축',
  irp: 'IRP',
  overseas: '해외직투',
  domestic: '국내투자',
}

export const ACCOUNT_TYPES: AccountType[] = ['isa', 'pension', 'irp', 'overseas', 'domestic']

export type DividendFrequency = 1 | 4 | 12  // 연/분기/월

export type Stock = {
  id: string
  name: string
  allocation: number           // 비중 (%)
  annualGrowth: number         // 연간 성장률 (%)
  dividendYield: number        // 연간 배당률 (%)
  dividendGrowth: number       // 배당 성장률 (%)
  dividendFrequency: DividendFrequency  // 배당 지급 주기
}

export type ReinvestAllocation = {
  id: string
  stockId: string
  ratio: number  // %
}

export type ConversionAllocation = {
  id: string
  stockId: string
  ratio: number  // %
}

export type ConversionStrategy = {
  enabled: boolean
  conversionYear: number
  sellRatio: number
  sourceStockIds: string[]
  allocations: ConversionAllocation[]
}

export type Account = {
  type: AccountType
  totalAmount: number
  stocks: Stock[]
  reinvestAllocations?: ReinvestAllocation[]  // 배당 재투자 배분 (없으면 재투자 안 함)
  conversionStrategy?: ConversionStrategy
}

export type FireTarget = {
  targetAsset: number
  targetMonthlyExpense: number
}

export type ContributionAllocation = {
  id: string
  stockId: string
  ratio: number  // %
}

export type MonthlyContribution = {
  accountType: AccountType
  monthlyAmount: number
  allocations: ContributionAllocation[]
}

export type ProjectionDetail = {
  startAsset: number
  yearlyContribution: number
  growthAmount: number
  reinvestAmount: number
  taxAmount: number
  conversionAmount: number
  conversionSourceCount: number
  conversionApplied: boolean
  monthlyContributionCount: number
  monthlyGrowthCount: number
  paymentCount: number
  monthlyDividendBeforeTax: number
  quarterlyDividendBeforeTax: number
  yearlyDividendBeforeTax: number
  monthlyDividendAfterTax: number
  quarterlyDividendAfterTax: number
  yearlyDividendAfterTax: number
}

export type YearlyProjection = {
  year: number
  totalAsset: number
  dividendBeforeTax: number
  dividendAfterTax: number
  detail?: ProjectionDetail
}
