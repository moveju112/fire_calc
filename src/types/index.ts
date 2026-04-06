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

export type Stock = {
  id: string
  name: string
  allocation: number      // 비중 (%)
  annualGrowth: number    // 연간 성장률 (%)
  dividendYield: number   // 배당률 (%)
  dividendGrowth: number  // 배당 성장률 (%)
}

export type Account = {
  type: AccountType
  totalAmount: number
  stocks: Stock[]
}

export type FireTarget = {
  targetAsset: number
  targetMonthlyExpense: number
}

export type YearlyProjection = {
  year: number
  totalAsset: number
  dividendBeforeTax: number
  dividendAfterTax: number
}
