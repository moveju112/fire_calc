import type { YearlyProjection } from '../../types'
import { fmt } from '../../utils/format'

type Props = {
  projections: YearlyProjection[]
  comparisonProjections?: YearlyProjection[]
  currentTotalAsset: number
  currentDividend: { before: number; after: number }
  fireSimYear?: number | null
  onFireSim?: (year: number) => void
  hideSensitiveInfo?: boolean
}

function renderFormulaValue(value: number) {
  return `${fmt(value, 2)}원`
}

function maskValue(value: string, hideSensitiveInfo?: boolean) {
  return hideSensitiveInfo ? '비공개' : value
}

function maskCurrency(value: number, hideSensitiveInfo?: boolean) {
  return maskValue(renderFormulaValue(value), hideSensitiveInfo)
}

function maskPercent(value: number, hideSensitiveInfo?: boolean) {
  return maskValue(`${value.toFixed(2)}%`, hideSensitiveInfo)
}

function ProjectionDetailTooltip({
  projection,
  hideSensitiveInfo,
}: {
  projection: YearlyProjection
  hideSensitiveInfo?: boolean
}) {
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
    <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-[32rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover/detail:block group-focus-within/detail:block">
      <div className="mb-3">
        <p className="text-xs font-semibold text-slate-800">{projection.year}년 후 계산식</p>
        <p className="mt-1 break-words whitespace-normal text-[11px] leading-5 text-slate-500">
          아래 값은 연말 한 번 계산한 값이 아니라, 12개월 동안 `납입 → 월 성장 → 지급주기별 배당 → 세금/재투자`를 반복한 연간 요약입니다.
        </p>
      </div>
      <div className="space-y-2 break-words whitespace-normal text-[11px] leading-5 text-slate-600">
        <p className="break-words whitespace-normal">
          {detail.conversionApplied
            ? `전환 전략: 선택 종목 ${detail.conversionSourceCount}개에서 ${renderFormulaValue(detail.conversionAmount)}를 매도 후 재배치`
            : '전환 전략: 이 연도에는 적용 없음'}
        </p>
        <p className="break-words whitespace-normal">
          월 납입: {detail.monthlyContributionCount}개월 동안 반영된 납입 합계 = <span className="font-semibold text-slate-800">{renderFormulaValue(detail.yearlyContribution)}</span>
        </p>
        <p className="break-words whitespace-normal">
          월 성장: 매달 `전월 잔고 × (1 + 연간성장률)^(1/12)` 적용, 연간 성장분 합계 = <span className="font-semibold text-slate-800">{renderFormulaValue(detail.growthAmount)}</span>
        </p>
        <p className="break-words whitespace-normal">
          세전 연간 배당: 지급월마다 `그달 잔고 × 적용 배당률 ÷ 지급횟수`를 합산 = <span className="font-semibold text-slate-800">{renderFormulaValue(projection.dividendBeforeTax)}</span>
        </p>
        <p className="break-words whitespace-normal">
          지급주기 반영:
          {hasMonthly ? ` 월배당 ${renderFormulaValue(detail.monthlyDividendBeforeTax)}` : ''}
          {hasQuarterly ? ` / 분기배당 ${renderFormulaValue(detail.quarterlyDividendBeforeTax)}` : ''}
          {hasYearly ? ` / 연배당 ${renderFormulaValue(detail.yearlyDividendBeforeTax)}` : ''}
          {!hasMonthly && !hasQuarterly && !hasYearly ? ' 배당 없음' : ''}
        </p>
        <p className="break-words whitespace-normal">
          세후 연간 배당: {renderFormulaValue(projection.dividendBeforeTax)} - 세금 {renderFormulaValue(detail.taxAmount)} = <span className="font-semibold text-emerald-700">{renderFormulaValue(projection.dividendAfterTax)}</span>
        </p>
        <p className="break-words whitespace-normal">
          {reinvestLabel}: 지급 시점마다 재투자된 금액 합계 = <span className="font-semibold text-slate-800">{renderFormulaValue(detail.reinvestAmount)}</span>
        </p>
        <p className="break-words whitespace-normal">
          총자산: 시작자산 {maskCurrency(detail.startAsset, hideSensitiveInfo)} + 납입합계 {renderFormulaValue(detail.yearlyContribution)} + 성장합계 {renderFormulaValue(detail.growthAmount)} + 재투자 반영 {renderFormulaValue(detail.reinvestAmount)} = <span className="font-semibold text-slate-800">{maskCurrency(projection.totalAsset, hideSensitiveInfo)}</span>
        </p>
        <p className="break-words whitespace-normal">
          세후 월 배당(표시용): {renderFormulaValue(projection.dividendAfterTax)} ÷ 12 = <span className="font-semibold text-emerald-700">{renderFormulaValue(monthlyDividend)}</span>
        </p>
        <p className="break-words whitespace-normal">
          배당률(연말 기준): {renderFormulaValue(projection.dividendAfterTax)} ÷ {maskCurrency(projection.totalAsset, hideSensitiveInfo)} × 100 = <span className="font-semibold text-slate-800">{maskPercent(yieldRate, hideSensitiveInfo)}</span>
        </p>
      </div>
    </div>
  )
}

function YearLabelWithTooltip({
  projection,
  fireAdjusted,
  hideSensitiveInfo,
}: {
  projection: YearlyProjection
  fireAdjusted?: boolean
  hideSensitiveInfo?: boolean
}) {
  return (
    <div className="group/detail relative inline-flex items-center gap-2 flex-wrap">
      <span>{projection.year}년 후</span>
      {fireAdjusted && (
        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          FIRE 이후 값
        </span>
      )}
      <span
        tabIndex={0}
        className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 outline-none transition-colors hover:bg-blue-100 focus:bg-blue-100"
      >
        계산식
      </span>
      <ProjectionDetailTooltip projection={projection} hideSensitiveInfo={hideSensitiveInfo} />
    </div>
  )
}

export function ProjectionTable({
  projections,
  comparisonProjections,
  currentTotalAsset,
  currentDividend,
  fireSimYear,
  onFireSim,
  hideSensitiveInfo,
}: Props) {
  const showComparison = Boolean(comparisonProjections?.length)
  const tableMinWidthClass = showComparison ? 'min-w-[1220px]' : 'min-w-[980px]'

  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${tableMinWidthClass} text-sm`}>
        <thead>
          <tr className="bg-slate-50 text-slate-600 text-xs">
            <th className="px-4 py-3 text-left whitespace-nowrap">연도</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">총자산</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">세전 연간 배당</th>
            {showComparison ? (
              <>
                <th className="px-4 py-3 text-right whitespace-nowrap">세후 연간 배당<br />미포함</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">세후 월 배당<br />미포함</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">세후 연간 배당<br />전환 반영</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">세후 월 배당<br />전환 반영</th>
              </>
            ) : (
              <>
                <th className="px-4 py-3 text-right whitespace-nowrap">세후 연간 배당</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">세후 월 배당 (추정)</th>
              </>
            )}
            <th className="px-4 py-3 text-right whitespace-nowrap">배당률</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">총 배당 증가율</th>
            {onFireSim && <th className="px-4 py-3 text-center whitespace-nowrap">FIRE 시뮬</th>}
          </tr>
        </thead>
        <tbody>
          {/* 현재 행 */}
          <tr className="border-b border-slate-100 bg-blue-50">
            <td className="px-4 py-3 font-medium text-blue-700 whitespace-nowrap">현재</td>
            <td className="px-4 py-3 text-right text-slate-800 whitespace-nowrap">{maskCurrency(currentTotalAsset, hideSensitiveInfo)}</td>
            <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{renderFormulaValue(currentDividend.before)}</td>
            {showComparison ? (
              <>
                <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{renderFormulaValue(currentDividend.after)}</td>
                <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{renderFormulaValue(currentDividend.after / 12)}</td>
                <td className="px-4 py-3 text-right text-emerald-600 font-medium whitespace-nowrap">{renderFormulaValue(currentDividend.after)}</td>
                <td className="px-4 py-3 text-right text-emerald-500 whitespace-nowrap">{renderFormulaValue(currentDividend.after / 12)}</td>
              </>
            ) : (
              <>
                <td className="px-4 py-3 text-right text-emerald-600 font-medium whitespace-nowrap">{renderFormulaValue(currentDividend.after)}</td>
                <td className="px-4 py-3 text-right text-emerald-500 whitespace-nowrap">{renderFormulaValue(currentDividend.after / 12)}</td>
              </>
            )}
            <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
              {currentTotalAsset > 0 ? maskPercent((currentDividend.after / currentTotalAsset) * 100, hideSensitiveInfo) : '-'}
            </td>
            <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">-</td>
            {onFireSim && <td className="px-4 py-3" />}
          </tr>

          {projections.map((p, index) => {
            const isFireYear = fireSimYear === p.year
            const isFireAdjusted = typeof fireSimYear === 'number' && p.year > fireSimYear
            const comparisonProjection = comparisonProjections?.[index]
            const prevDividendAfterTax =
              index === 0 ? currentDividend.after : projections[index - 1].dividendAfterTax
            const totalDividendGrowthRate =
              prevDividendAfterTax > 0
                ? ((p.dividendAfterTax - prevDividendAfterTax) / prevDividendAfterTax) * 100
                : null
            const dividendDifference = p.dividendAfterTax - (comparisonProjection?.dividendAfterTax ?? p.dividendAfterTax)

            return (
              <tr
                key={p.year}
                className={`border-b border-slate-100 hover:bg-slate-50 ${
                  isFireYear ? 'bg-amber-50' : isFireAdjusted ? 'bg-amber-50/40' : ''
                }`}
              >
                <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                  <YearLabelWithTooltip projection={p} fireAdjusted={isFireAdjusted} hideSensitiveInfo={hideSensitiveInfo} />
                </td>
                <td className="px-4 py-3 text-right text-slate-800 whitespace-nowrap">
                  <div className="whitespace-nowrap">{maskCurrency(p.totalAsset, hideSensitiveInfo)}</div>
                  {comparisonProjection && !hideSensitiveInfo && (
                    <div className={`text-[11px] whitespace-nowrap ${
                      p.totalAsset >= comparisonProjection.totalAsset ? 'text-emerald-600' : 'text-rose-500'
                    }`}>
                      전환 전 대비 {p.totalAsset >= comparisonProjection.totalAsset ? '+' : ''}{fmt(p.totalAsset - comparisonProjection.totalAsset, 0)}원
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{renderFormulaValue(p.dividendBeforeTax)}</td>
                {comparisonProjection ? (
                  <>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">{renderFormulaValue(comparisonProjection.dividendAfterTax)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{renderFormulaValue(comparisonProjection.dividendAfterTax / 12)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium whitespace-nowrap">
                      <div className="whitespace-nowrap">{renderFormulaValue(p.dividendAfterTax)}</div>
                      <div className={`text-[11px] whitespace-nowrap ${dividendDifference >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {dividendDifference >= 0 ? '+' : ''}{renderFormulaValue(dividendDifference)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-500 whitespace-nowrap">{renderFormulaValue(p.dividendAfterTax / 12)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium whitespace-nowrap">{renderFormulaValue(p.dividendAfterTax)}</td>
                    <td className="px-4 py-3 text-right text-emerald-500 whitespace-nowrap">{renderFormulaValue(p.dividendAfterTax / 12)}</td>
                  </>
                )}
                <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                  {p.totalAsset > 0 ? maskPercent((p.dividendAfterTax / p.totalAsset) * 100, hideSensitiveInfo) : '-'}
                </td>
                <td className={`px-4 py-3 text-right whitespace-nowrap ${
                  totalDividendGrowthRate === null
                    ? 'text-slate-400'
                    : totalDividendGrowthRate >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-500'
                }`}>
                  {totalDividendGrowthRate !== null ? `${totalDividendGrowthRate.toFixed(2)}%` : '-'}
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
