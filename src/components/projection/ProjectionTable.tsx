import type { YearlyProjection } from '../../types'
import { fmt } from '../../utils/format'

type Props = {
  projections: YearlyProjection[]
  fireSimYear?: number | null
  onFireSim?: (year: number) => void
}

export function ProjectionTable({ projections, fireSimYear, onFireSim }: Props) {
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
            {onFireSim && <th className="px-4 py-3 text-center">FIRE 시뮬</th>}
          </tr>
        </thead>
        <tbody>
          {projections.map((p) => {
            const isFireYear = fireSimYear === p.year
            return (
              <tr
                key={p.year}
                className={`border-b border-slate-100 hover:bg-slate-50 ${isFireYear ? 'bg-amber-50' : ''}`}
              >
                <td className="px-4 py-3 font-medium text-slate-700">{p.year}년 후</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(p.totalAsset)}원</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmt(p.dividendBeforeTax)}원</td>
                <td className="px-4 py-3 text-right text-emerald-600 font-medium">{fmt(p.dividendAfterTax)}원</td>
                <td className="px-4 py-3 text-right text-emerald-500">{fmt(p.dividendAfterTax / 12)}원</td>
                {onFireSim && (
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onFireSim(isFireYear ? 0 : p.year)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        isFireYear
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 border border-slate-200'
                      }`}
                    >
                      {isFireYear ? '✓ FIRE' : 'FIRE'}
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
