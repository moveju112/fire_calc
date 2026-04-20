import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { YearlyProjection } from '../../types'

type Props = {
  projections: YearlyProjection[]
  comparisonProjections?: YearlyProjection[]
  hideSensitiveInfo?: boolean
}

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

function HiddenChartPlaceholder() {
  return (
    <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
      <div>
        <p className="text-sm font-semibold text-slate-700">민감정보 숨김 중</p>
        <p className="mt-1 text-xs text-slate-500">총자산 선은 숨기고 배당 추이만 보여줍니다.</p>
      </div>
    </div>
  )
}

export function ProjectionChart({ projections, comparisonProjections, hideSensitiveInfo }: Props) {
  const data = projections.map((p) => ({
    year: `${p.year}년`,
    총자산: Math.round(p.totalAsset),
    세후배당: Math.round(p.dividendAfterTax),
    기준배당: Math.round(comparisonProjections?.find((item) => item.year === p.year)?.dividendAfterTax ?? p.dividendAfterTax),
  }))

  return (
    <div>
      {hideSensitiveInfo && <div className="mb-3"><HiddenChartPlaceholder /></div>}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11 }} width={70} />
          <Tooltip formatter={(value, name) => hideSensitiveInfo && name === '총자산' ? '비공개' : fmtTooltip(Number(value))} />
          <Legend />
          {!hideSensitiveInfo && <Line type="monotone" dataKey="총자산" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />}
          {comparisonProjections && (
            <Line type="monotone" dataKey="기준배당" name="세후배당(미포함)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} />
          )}
          <Line type="monotone" dataKey="세후배당" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
