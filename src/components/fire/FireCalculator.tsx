import { usePortfolioStore } from '../../store/portfolioStore'
import { calcAllAccountsProjection } from '../../utils/projection'
import { fmt } from '../../utils/format'

export function FireCalculator() {
  const accounts = usePortfolioStore((s) => s.accounts)
  const fireTarget = usePortfolioStore((s) => s.fireTarget)
  const setFireTarget = usePortfolioStore((s) => s.setFireTarget)

  const projections = calcAllAccountsProjection(Object.values(accounts))
  const currentAsset = Object.values(accounts).reduce((s, a) => s + a.totalAmount, 0)

  const requiredByExpense =
    fireTarget.targetMonthlyExpense > 0
      ? (fireTarget.targetMonthlyExpense * 12) / 0.04
      : 0

  const effectiveTarget = Math.max(fireTarget.targetAsset, requiredByExpense)

  const fireYear = projections.find((p) => p.totalAsset >= effectiveTarget)?.year ?? null

  const progress =
    effectiveTarget > 0 ? Math.min((currentAsset / effectiveTarget) * 100, 100) : 0

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-slate-800 mb-6">FIRE 계산</h2>

      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 w-40">목표 총자산</label>
          <input
            type="number"
            value={fireTarget.targetAsset === 0 ? '' : fireTarget.targetAsset}
            placeholder="0"
            onChange={(e) => setFireTarget({ targetAsset: parseFloat(e.target.value) || 0 })}
            className="w-48 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-sm text-slate-500">원</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700 w-40">목표 월 지출</label>
          <input
            type="number"
            value={fireTarget.targetMonthlyExpense === 0 ? '' : fireTarget.targetMonthlyExpense}
            placeholder="0"
            onChange={(e) =>
              setFireTarget({ targetMonthlyExpense: parseFloat(e.target.value) || 0 })
            }
            className="w-48 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-sm text-slate-500">원</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">현재 총자산</p>
          <p className="text-xl font-bold text-slate-800">{fmt(currentAsset)}원</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">4% 룰 필요 자산</p>
          <p className="text-xl font-bold text-slate-800">
            {requiredByExpense > 0 ? `${fmt(requiredByExpense)}원` : '-'}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">실질 목표 자산</p>
          <p className="text-xl font-bold text-blue-700">
            {effectiveTarget > 0 ? `${fmt(effectiveTarget)}원` : '-'}
          </p>
        </div>
        <div
          className={`rounded-lg p-4 border ${
            fireYear
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <p className="text-xs text-slate-500 mb-1">FIRE 달성 시점</p>
          <p
            className={`text-xl font-bold ${
              fireYear ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            {fireYear ? `${fireYear}년 후` : '10년 내 불가'}
          </p>
        </div>
      </div>

      {effectiveTarget > 0 && (
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>달성률</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
