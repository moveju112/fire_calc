/**
 * 원화 금액을 읽기 쉬운 형식으로 변환
 * 예: 150_000_000 → "1.50억"
 */
export function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}십억`
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return `${Math.round(n).toLocaleString()}`
}
