import { useState } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { calcProjection, calcAllAccountsProjection } from '../../utils/projection'
import { ACCOUNT_LABELS, ACCOUNT_TYPES, type AccountType } from '../../types'
import { ProjectionTable } from './ProjectionTable'
import { ProjectionChart } from './ProjectionChart'

type ViewMode = 'all' | AccountType

export function ProjectionTab() {
  const accounts = usePortfolioStore((s) => s.accounts)
  const [viewMode, setViewMode] = useState<ViewMode>('all')

  const projections =
    viewMode === 'all'
      ? calcAllAccountsProjection(Object.values(accounts))
      : calcProjection(accounts[viewMode])

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
        <ProjectionTable projections={projections} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <ProjectionChart projections={projections} />
      </div>
    </div>
  )
}
