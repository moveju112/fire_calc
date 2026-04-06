// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getTaxRate, calcAfterTax, ISA_TAX_FREE_LIMIT } from '../taxCalc'

describe('getTaxRate', () => {
  it('ISA는 기본 0 (비과세 한도 내)', () => {
    expect(getTaxRate('isa')).toBe(0)
  })
  it('연금저축은 0.033', () => {
    expect(getTaxRate('pension')).toBe(0.033)
  })
  it('IRP는 0.033', () => {
    expect(getTaxRate('irp')).toBe(0.033)
  })
  it('해외직투는 0.15', () => {
    expect(getTaxRate('overseas')).toBe(0.15)
  })
  it('국내투자는 0.154', () => {
    expect(getTaxRate('domestic')).toBe(0.154)
  })
})

describe('calcAfterTax', () => {
  it('ISA: 연간 배당이 비과세 한도 이하이면 전액 반환', () => {
    const dividend = ISA_TAX_FREE_LIMIT - 1
    expect(calcAfterTax('isa', dividend)).toBe(dividend)
  })

  it('ISA: 비과세 한도 초과분에만 9.9% 적용', () => {
    const dividend = ISA_TAX_FREE_LIMIT + 1_000_000
    const excess = 1_000_000
    const expected = ISA_TAX_FREE_LIMIT + excess * (1 - 0.099)
    expect(calcAfterTax('isa', dividend)).toBeCloseTo(expected, 0)
  })

  it('연금저축: 3.3% 세율 적용', () => {
    expect(calcAfterTax('pension', 1_000_000)).toBeCloseTo(967_000, 0)
  })

  it('IRP: 3.3% 세율 적용', () => {
    expect(calcAfterTax('irp', 1_000_000)).toBeCloseTo(967_000, 0)
  })

  it('해외직투: 15% 세율 적용', () => {
    expect(calcAfterTax('overseas', 1_000_000)).toBe(850_000)
  })

  it('국내투자: 15.4% 세율 적용', () => {
    expect(calcAfterTax('domestic', 1_000_000)).toBeCloseTo(846_000, 0)
  })
})
