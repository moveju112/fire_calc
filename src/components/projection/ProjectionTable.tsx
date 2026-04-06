import type { YearlyProjection } from '../../types'
import { fmt } from '../../utils/format'

type Props = { projections: YearlyProjection[] }

export function ProjectionTable({ projections }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-600 text-xs">
            <th className="px-4 py-3 text-left">연도</th>
            <th className="px-4 py-3 text-right">총자산</th>
            <th className="px-4 py-3 text-right">세전 연간 배당</th>
            <th className="px-4 py-3 text-right">세후 연간 배당</th>
            <th className="px-4 py-3 text-right">세후 월 배당 (추정)</th>
          </tr>
        </thead>
        <tbody>
          {projections.map((p) => (
            <tr key={p.year} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-700">{p.year}년 후</td>
              <td className="px-4 py-3 text-right text-slate-800">{fmt(p.totalAsset)}원</td>
              <td className="px-4 py-3 text-right text-slate-600">{fmt(p.dividendBeforeTax)}원</td>
              <td className="px-4 py-3 text-right text-emerald-600 font-medium">{fmt(p.dividendAfterTax)}원</td>
              <td className="px-4 py-3 text-right text-emerald-500">{fmt(p.dividendAfterTax / 12)}원</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
