import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { YearlyProjection } from '../../types'

type Props = {
  fireYear: number
  pre: YearlyProjection[]
  post: YearlyProjection[]
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

function HiddenChartPlaceholder({ fireYear }: { fireYear: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-amber-700">
          🔥 {fireYear}년 후 FIRE 시뮬레이션
        </span>
        <span className="text-xs text-slate-500">
          민감정보 숨김 상태에서는 차트를 가립니다.
        </span>
      </div>
      <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-amber-200 bg-amber-50/40 px-4 text-center">
        <div>
          <p className="text-sm font-semibold text-amber-700">민감정보 숨김 중</p>
          <p className="mt-1 text-xs text-slate-500">총자산 선은 숨기고 배당 추이만 보여줍니다.</p>
        </div>
      </div>
    </div>
  )
}

export function FireSimChart({ fireYear, pre, post, hideSensitiveInfo }: Props) {
  // pre + post 를 하나의 data 배열로 합침
  // FIRE 이전: 총자산_pre, 세후배당_pre 가 유효값, 이후는 null
  // FIRE 이후: 총자산_post, 세후배당_post 가 유효값, 이전은 null
  const data: Record<string, string | number | null>[] = []

  // FIRE 시점 행은 pre 마지막 값을 두 라인이 공유 (연결점)
  pre.forEach((p, i) => {
    const isLast = i === pre.length - 1
    data.push({
      year: `${p.year}년`,
      '총자산 (납입·재투자)': Math.round(p.totalAsset),
      '세후배당 (납입·재투자)': Math.round(p.dividendAfterTax),
      // FIRE 시점에서 post 라인이 시작할 수 있도록 연결
      '총자산 (FIRE 이후)': isLast ? Math.round(p.totalAsset) : null,
      '세후배당 (FIRE 이후)': isLast ? Math.round(p.dividendAfterTax) : null,
    })
  })

  post.forEach((p) => {
    data.push({
      year: `${p.year}년`,
      '총자산 (납입·재투자)': null,
      '세후배당 (납입·재투자)': null,
      '총자산 (FIRE 이후)': Math.round(p.totalAsset),
      '세후배당 (FIRE 이후)': Math.round(p.dividendAfterTax),
    })
  })

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-amber-700">
          🔥 {fireYear}년 후 FIRE 시뮬레이션
        </span>
        <span className="text-xs text-slate-500">
          — FIRE 이후 납입·재투자 중단, 순수 성장+배당만 반영
        </span>
      </div>
      {hideSensitiveInfo && <div className="mb-3"><HiddenChartPlaceholder fireYear={fireYear} /></div>}
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} interval={Math.floor(data.length / 8)} />
          <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11 }} width={70} />
          <Tooltip formatter={(value, name) => hideSensitiveInfo && String(name).includes('총자산') ? '비공개' : fmtTooltip(Number(value))} />
          <Legend />
          <ReferenceLine
            x={`${fireYear}년`}
            stroke="#f59e0b"
            strokeDasharray="4 2"
            label={{ value: 'FIRE', position: 'top', fontSize: 11, fill: '#b45309' }}
          />
          {/* FIRE 이전 — 실선 */}
          {!hideSensitiveInfo && (
            <Line
              type="monotone"
              dataKey="총자산 (납입·재투자)"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="세후배당 (납입·재투자)"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          {/* FIRE 이후 — 점선 */}
          {!hideSensitiveInfo && (
            <Line
              type="monotone"
              dataKey="총자산 (FIRE 이후)"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="세후배당 (FIRE 이후)"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
