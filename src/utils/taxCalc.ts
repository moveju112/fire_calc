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

/**
 * ISA 월/분기 지급 시 연간 누적액 기준으로 세후 금액 계산
 * @param payment       이번 지급 세전 금액
 * @param yearCumulative 이번 지급 이전까지의 올해 누적 세전 배당 합계
 */
export function calcIsaAfterTaxIncremental(payment: number, yearCumulative: number): number {
  const afterCumulative = yearCumulative + payment
  if (afterCumulative <= ISA_TAX_FREE_LIMIT) {
    return payment  // 전액 비과세
  } else if (yearCumulative >= ISA_TAX_FREE_LIMIT) {
    return payment * (1 - 0.099)  // 전액 9.9% 과세
  } else {
    // 한도 걸침: 비과세분 + 과세분
    const taxFree = ISA_TAX_FREE_LIMIT - yearCumulative
    const taxed = payment - taxFree
    return taxFree + taxed * (1 - 0.099)
  }
}
