import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { YearlyProjection } from '../../types'

type Props = { projections: YearlyProjection[] }

function fmtYAxis(value: number) {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(0)}조`
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}억`
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만`
  return `${value}`
}

function fmtTooltip(value: number) {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(0)}조원`
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}억원`
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만원`
  return `${Math.round(value).toLocaleString()}원`
}

export function ProjectionChart({ projections }: Props) {
  const data = projections.map((p) => ({
    year: `${p.year}년`,
    총자산: Math.round(p.totalAsset),
    세후배당: Math.round(p.dividendAfterTax),
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11 }} width={70} />
        <Tooltip formatter={(value) => fmtTooltip(Number(value))} />
        <Legend />
        <Line type="monotone" dataKey="총자산" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="세후배당" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
