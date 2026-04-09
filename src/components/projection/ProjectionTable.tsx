import type { YearlyProjection } from '../../types'
import { fmt } from '../../utils/format'

type Props = {
  projections: YearlyProjection[]
  currentTotalAsset: number
  currentDividend: { before: number; after: number }
  fireSimYear?: number | null
  onFireSim?: (year: number) => void
}

function renderFormulaValue(value: number) {
  return `${fmt(value, 2)}원`
}

function ProjectionDetailTooltip({ projection }: { projection: YearlyProjection }) {
  const detail = projection.detail
  if (!detail) return null

  const monthlyDividend = projection.dividendAfterTax / 12
  const yieldRate = projection.totalAsset > 0 ? (projection.dividendAfterTax / projection.totalAsset) * 100 : 0
  const hasMonthly = detail.monthlyDividendBeforeTax > 0
  const hasQuarterly = detail.quarterlyDividendBeforeTax > 0
  const hasYearly = detail.yearlyDividendBeforeTax > 0
  const reinvestLabel = Math.abs(detail.reinvestAmount - projection.dividendAfterTax) < 0.01
    ? '세후 배당 재투자'
    : '재투자 반영액'

  return (
    <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-[26rem] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover/detail:block group-focus-within/detail:block">
      <div className="mb-3">
        <p className="text-xs font-semibold text-slate-800">{projection.year}년 후 계산식</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          아래 값은 연말 한 번 계산한 값이 아니라, 12개월 동안 `납입 → 월 성장 → 지급주기별 배당 → 세금/재투자`를 반복한 연간 요약입니다.
        </p>
      </div>
      <div className="space-y-2 text-[11px] leading-5 text-slate-600">
        <p>
          월 납입: {detail.monthlyContributionCount}개월 동안 반영된 납입 합계 = <span className="font-semibold text-slate-800">{renderFormulaValue(detail.yearlyContribution)}</span>
        </p>
        <p>
          월 성장: 매달 `전월 잔고 × (1 + 연간성장률)^(1/12)` 적용, 연간 성장분 합계 = <span className="font-semibold text-slate-800">{renderFormulaValue(detail.growthAmount)}</span>
        </p>
        <p>
          세전 연간 배당: 지급월마다 `그달 잔고 × 적용 배당률 ÷ 지급횟수`를 합산 = <span className="font-semibold text-slate-800">{renderFormulaValue(projection.dividendBeforeTax)}</span>
        </p>
        <p>
          지급주기 반영:
          {hasMonthly ? ` 월배당 ${renderFormulaValue(detail.monthlyDividendBeforeTax)}` : ''}
          {hasQuarterly ? ` / 분기배당 ${renderFormulaValue(detail.quarterlyDividendBeforeTax)}` : ''}
          {hasYearly ? ` / 연배당 ${renderFormulaValue(detail.yearlyDividendBeforeTax)}` : ''}
          {!hasMonthly && !hasQuarterly && !hasYearly ? ' 배당 없음' : ''}
        </p>
        <p>
          세후 연간 배당: {renderFormulaValue(projection.dividendBeforeTax)} - 세금 {renderFormulaValue(detail.taxAmount)} = <span className="font-semibold text-emerald-700">{renderFormulaValue(projection.dividendAfterTax)}</span>
        </p>
        <p>
          {reinvestLabel}: 지급 시점마다 재투자된 금액 합계 = <span className="font-semibold text-slate-800">{renderFormulaValue(detail.reinvestAmount)}</span>
        </p>
        <p>
          총자산: 시작자산 {renderFormulaValue(detail.startAsset)} + 납입합계 {renderFormulaValue(detail.yearlyContribution)} + 성장합계 {renderFormulaValue(detail.growthAmount)} + 재투자 반영 {renderFormulaValue(detail.reinvestAmount)} = <span className="font-semibold text-slate-800">{renderFormulaValue(projection.totalAsset)}</span>
        </p>
        <p>
          세후 월 배당(표시용): {renderFormulaValue(projection.dividendAfterTax)} ÷ 12 = <span className="font-semibold text-emerald-700">{renderFormulaValue(monthlyDividend)}</span>
        </p>
        <p>
          배당률(연말 기준): {renderFormulaValue(projection.dividendAfterTax)} ÷ {renderFormulaValue(projection.totalAsset)} × 100 = <span className="font-semibold text-slate-800">{yieldRate.toFixed(2)}%</span>
        </p>
      </div>
    </div>
  )
}

function YearLabelWithTooltip({ projection }: { projection: YearlyProjection }) {
  return (
    <div className="group/detail relative inline-flex items-center gap-2">
      <span>{projection.year}년 후</span>
      <span
        tabIndex={0}
        className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 outline-none transition-colors hover:bg-blue-100 focus:bg-blue-100"
      >
        계산식
      </span>
      <ProjectionDetailTooltip projection={projection} />
    </div>
  )
}

export function ProjectionTable({ projections, currentTotalAsset, currentDividend, fireSimYear, onFireSim }: Props) {
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
            <th className="px-4 py-3 text-right">배당률</th>
            {onFireSim && <th className="px-4 py-3 text-center">FIRE 시뮬</th>}
          </tr>
        </thead>
        <tbody>
          {/* 현재 행 */}
          <tr className="border-b border-slate-100 bg-blue-50">
            <td className="px-4 py-3 font-medium text-blue-700">현재</td>
            <td className="px-4 py-3 text-right text-slate-800">{fmt(currentTotalAsset, 2)}원</td>
            <td className="px-4 py-3 text-right text-slate-600">{fmt(currentDividend.before, 2)}원</td>
            <td className="px-4 py-3 text-right text-emerald-600 font-medium">{fmt(currentDividend.after, 2)}원</td>
            <td className="px-4 py-3 text-right text-emerald-500">{fmt(currentDividend.after / 12, 2)}원</td>
            <td className="px-4 py-3 text-right text-slate-500">
              {currentTotalAsset > 0 ? `${(currentDividend.after / currentTotalAsset * 100).toFixed(2)}%` : '-'}
            </td>
            {onFireSim && <td className="px-4 py-3" />}
          </tr>

          {projections.map((p) => {
            const isFireYear = fireSimYear === p.year
            return (
              <tr
                key={p.year}
                className={`border-b border-slate-100 hover:bg-slate-50 ${isFireYear ? 'bg-amber-50' : ''}`}
              >
                <td className="px-4 py-3 font-medium text-slate-700">
                  <YearLabelWithTooltip projection={p} />
                </td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(p.totalAsset, 2)}원</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmt(p.dividendBeforeTax, 2)}원</td>
                <td className="px-4 py-3 text-right text-emerald-600 font-medium">{fmt(p.dividendAfterTax, 2)}원</td>
                <td className="px-4 py-3 text-right text-emerald-500">{fmt(p.dividendAfterTax / 12, 2)}원</td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {p.totalAsset > 0 ? `${(p.dividendAfterTax / p.totalAsset * 100).toFixed(2)}%` : '-'}
                </td>
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
