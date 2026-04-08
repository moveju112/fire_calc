/**
 * 원화 금액을 읽기 쉬운 형식으로 변환
 * @param decimals 소수점 자릿수 (기본 0)
 */
export function fmt(n: number, decimals = 0): string {
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(decimals)}조`
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(decimals)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(decimals)}만`
  return `${Math.round(n).toLocaleString()}`
}
