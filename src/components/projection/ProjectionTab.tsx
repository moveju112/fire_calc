import { useState } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { calcProjection, calcAllAccountsProjection, calcFireSimProjection } from '../../utils/projection'
import { ACCOUNT_LABELS, ACCOUNT_TYPES, type AccountType } from '../../types'
import { ProjectionTable } from './ProjectionTable'
import { ProjectionChart } from './ProjectionChart'
import { FireSimChart } from './FireSimChart'

type ViewMode = 'all' | AccountType

export function ProjectionTab() {
  const accounts = usePortfolioStore((s) => s.accounts)
  const contributions = usePortfolioStore((s) => s.contributions)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [fireSimYear, setFireSimYear] = useState<number | null>(null)

  const projections =
    viewMode === 'all'
      ? calcAllAccountsProjection(Object.values(accounts), contributions)
      : calcProjection(accounts[viewMode], contributions[viewMode])

  // FIRE 시뮬: 전체 계좌 기준으로만 계산 (저장 안 함)
  const fireSim =
    fireSimYear
      ? calcFireSimProjection(Object.values(accounts), contributions, fireSimYear)
      : null

  const handleFireSim = (year: number) => {
    setFireSimYear(year === 0 ? null : year)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">10년 예측 분석</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            전체 합계
          </button>
          {ACCOUNT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setViewMode(type)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {ACCOUNT_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 mb-6">
        <ProjectionTable
          projections={projections}
          fireSimYear={fireSimYear}
          onFireSim={handleFireSim}
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <ProjectionChart projections={projections} />
      </div>

      {fireSim && fireSimYear && (
        <div className="bg-white rounded-lg border border-amber-200 p-4">
          <FireSimChart
            fireYear={fireSimYear}
            pre={fireSim.pre}
            post={fireSim.post}
          />
        </div>
      )}
    </div>
  )
}
