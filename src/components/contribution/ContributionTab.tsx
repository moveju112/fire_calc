import { useState, useEffect, useRef } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { ACCOUNT_LABELS, ACCOUNT_TYPES, type AccountType } from '../../types'

function formatWithCommas(n: number): string {
  return n === 0 ? '' : n.toLocaleString('ko-KR')
}

export function ContributionTab() {
  const [selectedAccount, setSelectedAccount] = useState<AccountType>('isa')

  const accounts = usePortfolioStore((s) => s.accounts)
  const contributions = usePortfolioStore((s) => s.contributions)
  const setContributionAmount = usePortfolioStore((s) => s.setContributionAmount)
  const addContributionAllocation = usePortfolioStore((s) => s.addContributionAllocation)
  const updateContributionAllocation = usePortfolioStore((s) => s.updateContributionAllocation)
  const removeContributionAllocation = usePortfolioStore((s) => s.removeContributionAllocation)

  const account = accounts[selectedAccount]
  const contribution = contributions[selectedAccount]

  // 월 납입액 입력 로컬 상태
  const [amountDisplay, setAmountDisplay] = useState(() => formatWithCommas(contribution.monthlyAmount))
  const amountFocused = useRef(false)

  useEffect(() => {
    if (!amountFocused.current) {
      setAmountDisplay(formatWithCommas(contribution.monthlyAmount))
    }
  }, [contribution.monthlyAmount, selectedAccount])

  const handleAmountChange = (raw: string) => {
    const num = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0
    setAmountDisplay(num === 0 ? '' : num.toLocaleString('ko-KR'))
    setContributionAmount(selectedAccount, num)
  }

  const totalRatio = contribution.allocations.reduce((sum, a) => sum + a.ratio, 0)
  const ratioOk = contribution.allocations.length === 0 || Math.abs(totalRatio - 100) < 0.01

  // 전체 월 납입 합산
  const totalMonthly = ACCOUNT_TYPES.reduce(
    (sum, t) => sum + contributions[t].monthlyAmount,
    0
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">월 납입 설정</h2>
        {totalMonthly > 0 && (
          <span className="text-sm text-slate-500">
            전체 월 납입 합계: <span className="font-semibold text-slate-700">{totalMonthly.toLocaleString('ko-KR')}원</span>
          </span>
        )}
      </div>

      {/* 계좌 탭 선택 */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {ACCOUNT_TYPES.map((type) => {
          const hasContrib = contributions[type].monthlyAmount > 0
          return (
            <button
              key={type}
              onClick={() => setSelectedAccount(type)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors relative ${
                selectedAccount === type
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {ACCOUNT_LABELS[type]}
              {hasContrib && (
                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 align-middle" />
              )}
            </button>
          )
        })}
      </div>

      {/* 월 납입액 */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-slate-700 w-28 shrink-0">월 납입액</label>
        <input
          type="text"
          inputMode="numeric"
          value={amountDisplay}
          placeholder="0"
          onFocus={() => { amountFocused.current = true }}
          onBlur={() => { amountFocused.current = false }}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="w-48 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-right"
        />
        <span className="text-sm text-slate-500">원</span>
        {contribution.monthlyAmount > 0 && (
          <span className="text-sm text-slate-400">
            (연 {(contribution.monthlyAmount * 12).toLocaleString('ko-KR')}원)
          </span>
        )}
      </div>

      {/* 종목 배분 */}
      {contribution.monthlyAmount > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-700">종목별 배분</h3>
            {!ratioOk && contribution.allocations.length > 0 && (
              <span className="text-xs text-red-500">
                ⚠ 비율 합계 {totalRatio.toFixed(1)}% (100%가 되어야 합니다)
              </span>
            )}
            {ratioOk && totalRatio === 100 && contribution.allocations.length > 0 && (
              <span className="text-xs text-emerald-600">✓ 합계 100%</span>
            )}
          </div>

          {account.stocks.length === 0 ? (
            <p className="text-sm text-slate-400 italic">
              먼저 {ACCOUNT_LABELS[selectedAccount]} 포트폴리오에 종목을 추가해주세요.
            </p>
          ) : (
            <>
              {contribution.allocations.length > 0 && (
                <div className="space-y-2 mb-3">
                  {contribution.allocations.map((alloc) => {
                    const stock = account.stocks.find((s) => s.id === alloc.stockId)
                    const previewAmount =
                      alloc.ratio > 0 && contribution.monthlyAmount > 0
                        ? Math.round(contribution.monthlyAmount * (alloc.ratio / 100))
                        : 0

                    return (
                      <div key={alloc.id} className="flex items-center gap-2 bg-slate-50 rounded-md px-3 py-2">
                        {/* 종목 선택 */}
                        <select
                          value={alloc.stockId}
                          onChange={(e) =>
                            updateContributionAllocation(selectedAccount, alloc.id, { stockId: e.target.value })
                          }
                          className="flex-1 px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        >
                          <option value="">종목 선택</option>
                          {account.stocks.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name || '(이름 없음)'}
                            </option>
                          ))}
                        </select>

                        {/* 비율 */}
                        <div className="flex items-center gap-1 w-28 shrink-0">
                          <input
                            type="number"
                            value={alloc.ratio === 0 ? '' : alloc.ratio}
                            placeholder="0"
                            min={0}
                            max={100}
                            onChange={(e) =>
                              updateContributionAllocation(selectedAccount, alloc.id, {
                                ratio: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 text-right"
                          />
                          <span className="text-sm text-slate-500">%</span>
                        </div>

                        {/* 금액 미리보기 */}
                        <span className="text-sm text-slate-500 w-32 text-right shrink-0">
                          {previewAmount > 0
                            ? `${previewAmount.toLocaleString('ko-KR')}원`
                            : stock && alloc.ratio > 0 ? '-' : ''}
                        </span>

                        {/* 삭제 */}
                        <button
                          onClick={() => removeContributionAllocation(selectedAccount, alloc.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none ml-1"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => addContributionAllocation(selectedAccount)}
                className="px-3 py-1.5 text-sm border border-dashed border-slate-300 text-slate-500 rounded-md hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                + 종목 추가
              </button>
            </>
          )}
        </div>
      )}

      {/* 전체 계좌 요약 */}
      {totalMonthly > 0 && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">계좌별 납입 요약</h3>
          <div className="space-y-1">
            {ACCOUNT_TYPES.filter((t) => contributions[t].monthlyAmount > 0).map((type) => {
              const c = contributions[type]
              return (
                <div key={type} className="flex items-center justify-between text-sm py-1">
                  <span className="text-slate-600">{ACCOUNT_LABELS[type]}</span>
                  <span className="font-medium text-slate-800">
                    {c.monthlyAmount.toLocaleString('ko-KR')}원 / 월
                  </span>
                </div>
              )
            })}
            <div className="flex items-center justify-between text-sm py-1 border-t border-slate-200 mt-2 pt-2 font-semibold">
              <span className="text-slate-700">합계</span>
              <span className="text-blue-700">{totalMonthly.toLocaleString('ko-KR')}원 / 월</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
