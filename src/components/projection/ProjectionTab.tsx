import { useState } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { calcProjection, calcAllAccountsProjection, calcFireSimProjection } from '../../utils/projection'
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

  const projections =
    viewMode === 'all'
      ? calcAllAccountsProjection(Object.values(accounts), contributions)
      : calcProjection(accounts[viewMode], contributions[viewMode])

  const currentTotalAsset =
    viewMode === 'all'
      ? Object.values(accounts).reduce((sum, a) => sum + a.totalAmount, 0)
      : accounts[viewMode].totalAmount

  const currentDividend =
    viewMode === 'all'
      ? calcCurrentDividend(Object.values(accounts))
      : calcCurrentDividend([accounts[viewMode]])

  const fireSimAccounts =
    viewMode === 'all'
      ? Object.values(accounts)
      : [accounts[viewMode]]

  // FIRE 시뮬: 현재 선택된 뷰 기준으로만 계산 (저장 안 함)
  const fireSim =
    fireSimYear
      ? calcFireSimProjection(fireSimAccounts, contributions, fireSimYear)
      : null

  const tableProjections =
    fireSim && fireSimYear
      ? projections.map((projection) => {
          if (projection.year <= fireSimYear) {
            return fireSim.pre[projection.year - 1] ?? projection
          }
          return fireSim.post[projection.year - fireSimYear - 1] ?? projection
        })
      : projections

  const handleFireSim = (year: number) => {
    setFireSimYear(year === 0 ? null : year)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
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
        <ProjectionTable
          projections={tableProjections}
          currentTotalAsset={currentTotalAsset}
          currentDividend={currentDividend}
          fireSimYear={fireSimYear}
          onFireSim={handleFireSim}
          hideSensitiveInfo={hideSensitiveInfo}
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <ProjectionChart projections={projections} hideSensitiveInfo={hideSensitiveInfo} />
      </div>

      {fireSim && fireSimYear && (
        <div className="bg-white rounded-lg border border-amber-200 p-4">
          <FireSimChart
            fireYear={fireSimYear}
            pre={fireSim.pre}
            post={fireSim.post}
            hideSensitiveInfo={hideSensitiveInfo}
          />
        </div>
      )}
    </div>
  )
}
