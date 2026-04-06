import type { AccountType } from '../types'

export const ISA_TAX_FREE_LIMIT = 2_000_000 // 연 200만원 비과세 한도

export function getTaxRate(accountType: AccountType): number {
  switch (accountType) {
    case 'isa': return 0
    case 'pension': return 0.033
    case 'irp': return 0.033
    case 'overseas': return 0.15
    case 'domestic': return 0.154
  }
}

export function calcAfterTax(accountType: AccountType, dividendBeforeTax: number): number {
  if (accountType === 'isa') {
    if (dividendBeforeTax <= ISA_TAX_FREE_LIMIT) return dividendBeforeTax
    const excess = dividendBeforeTax - ISA_TAX_FREE_LIMIT
    return ISA_TAX_FREE_LIMIT + excess * (1 - 0.099)
  }
  return dividendBeforeTax * (1 - getTaxRate(accountType))
}
