import { useState } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import {
  calcProjection,
  calcAllAccountsProjection,
  calcFireSimProjection,
  hasAnyActiveConversionStrategy,
} from '../../utils/projection'
import { calcAfterTax } from '../../utils/taxCalc'
import { ACCOUNT_LABELS, ACCOUNT_TYPES, type AccountType, type Account } from '../../types'
import { ProjectionTable } from './ProjectionTable'
import { ProjectionChart } from './ProjectionChart'
import { FireSimChart } from './FireSimChart'

function calcCurrentDividend(accountList: Account[]): { before: number; after: number } {
  let before = 0
  let after = 0
  for (const account of accountList) {
    let accountBefore = 0
    for (const stock of account.stocks) {
      const balance = account.totalAmount * (stock.allocation / 100)
      accountBefore += balance * (stock.dividendYield / 100)
    }
    before += accountBefore
    after += calcAfterTax(account.type, accountBefore)
  }
  return { before, after }
}

type ViewMode = 'all' | AccountType

export function ProjectionTab() {
  const accounts = usePortfolioStore((s) => s.accounts)
  const contributions = usePortfolioStore((s) => s.contributions)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [fireSimYear, setFireSimYear] = useState<number | null>(null)
  const [hideSensitiveInfo, setHideSensitiveInfo] = useState(false)
  const visibleAccounts =
    viewMode === 'all'
      ? Object.values(accounts)
      : [accounts[viewMode]]
  const hasConversionStrategy = hasAnyActiveConversionStrategy(visibleAccounts)

  const baseProjections =
    viewMode === 'all'
      ? calcAllAccountsProjection(Object.values(accounts), contributions)
      : calcProjection(accounts[viewMode], contributions[viewMode])
  const strategyProjections =
    hasConversionStrategy
      ? (viewMode === 'all'
          ? calcAllAccountsProjection(Object.values(accounts), contributions, { includeConversion: true })
          : calcProjection(accounts[viewMode], contributions[viewMode], { includeConversion: true }))
      : baseProjections

  const currentTotalAsset =
    viewMode === 'all'
      ? Object.values(accounts).reduce((sum, a) => sum + a.totalAmount, 0)
      : accounts[viewMode].totalAmount

  const currentDividend =
    viewMode === 'all'
      ? calcCurrentDividend(Object.values(accounts))
      : calcCurrentDividend([accounts[viewMode]])

  const fireSimAccounts = visibleAccounts

  // FIRE 시뮬: 현재 선택된 뷰 기준으로만 계산 (저장 안 함)
  const baseFireSim =
    fireSimYear
      ? calcFireSimProjection(fireSimAccounts, contributions, fireSimYear)
      : null
  const strategyFireSim =
    fireSimYear && hasConversionStrategy
      ? calcFireSimProjection(fireSimAccounts, contributions, fireSimYear, 20, { includeConversion: true })
      : null

  const tableBaseProjections =
    baseFireSim && fireSimYear
      ? baseProjections.map((projection) => {
          if (projection.year <= fireSimYear) {
            return baseFireSim.pre[projection.year - 1] ?? projection
          }
          return baseFireSim.post[projection.year - fireSimYear - 1] ?? projection
        })
      : baseProjections
  const tableStrategyProjections =
    strategyFireSim && fireSimYear
      ? strategyProjections.map((projection) => {
          if (projection.year <= fireSimYear) {
            return strategyFireSim.pre[projection.year - 1] ?? projection
          }
          return strategyFireSim.post[projection.year - fireSimYear - 1] ?? projection
        })
      : strategyProjections
  const tableProjections = hasConversionStrategy ? tableStrategyProjections : tableBaseProjections

  const handleFireSim = (year: number) => {
    setFireSimYear(year === 0 ? null : year)
  }

  return (
    <div className="p-6 max-w-[96rem] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">20년 예측 분석</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setHideSensitiveInfo((prev) => !prev)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              hideSensitiveInfo
                ? 'border-slate-300 bg-slate-700 text-white hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {hideSensitiveInfo ? '민감정보 표시' : '민감정보 숨기기'}
          </button>
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
        {hasConversionStrategy && (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            전환 반영 배당과 전환 미포함 배당을 함께 비교합니다. 기준 총자산과 증가분은 전환 반영 시나리오 기준입니다.
          </div>
        )}
        <ProjectionTable
          projections={tableProjections}
          comparisonProjections={hasConversionStrategy ? tableBaseProjections : undefined}
          currentTotalAsset={currentTotalAsset}
          currentDividend={currentDividend}
          fireSimYear={fireSimYear}
          onFireSim={handleFireSim}
          hideSensitiveInfo={hideSensitiveInfo}
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <ProjectionChart
          projections={strategyProjections}
          comparisonProjections={hasConversionStrategy ? baseProjections : undefined}
          hideSensitiveInfo={hideSensitiveInfo}
        />
      </div>

      {baseFireSim && fireSimYear && (
        <div className="bg-white rounded-lg border border-amber-200 p-4">
          <FireSimChart
            fireYear={fireSimYear}
            pre={strategyFireSim?.pre ?? baseFireSim.pre}
            post={strategyFireSim?.post ?? baseFireSim.post}
            hideSensitiveInfo={hideSensitiveInfo}
          />
        </div>
      )}
    </div>
  )
}
