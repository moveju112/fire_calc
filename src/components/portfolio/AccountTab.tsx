import { useState, useEffect, useRef } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import { StockRow } from './StockRow'
import { ACCOUNT_LABELS, type AccountType } from '../../types'

type Props = { accountType: AccountType }

function formatWithCommas(n: number): string {
  return n === 0 ? '' : n.toLocaleString('ko-KR')
}

export function AccountTab({ accountType }: Props) {
  const account = usePortfolioStore((s) => s.accounts[accountType])
  const setTotalAmount = usePortfolioStore((s) => s.setTotalAmount)
  const addStock = usePortfolioStore((s) => s.addStock)
  const updateStock = usePortfolioStore((s) => s.updateStock)
  const removeStock = usePortfolioStore((s) => s.removeStock)
  const setStockAmount = usePortfolioStore((s) => s.setStockAmount)
  const addReinvestAllocation = usePortfolioStore((s) => s.addReinvestAllocation)
  const updateReinvestAllocation = usePortfolioStore((s) => s.updateReinvestAllocation)
  const removeReinvestAllocation = usePortfolioStore((s) => s.removeReinvestAllocation)

  const [amountDisplay, setAmountDisplay] = useState(() => formatWithCommas(account.totalAmount))
  const totalFocused = useRef(false)

  // 총액 포커스 밖에 있을 때 store 값과 동기화 (탭 전환 or 금액 수정에 의한 변경)
  useEffect(() => {
    if (!totalFocused.current) {
      setAmountDisplay(formatWithCommas(account.totalAmount))
    }
  }, [account.totalAmount, accountType])

  const handleAmountChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '')
    const num = parseInt(digitsOnly, 10) || 0
    setAmountDisplay(num === 0 ? '' : num.toLocaleString('ko-KR'))
    setTotalAmount(accountType, num)
  }

  const totalAllocation = account.stocks.reduce((sum, s) => sum + s.allocation, 0)
  const allocationOver = totalAllocation > 100 + 0.0001

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        {ACCOUNT_LABELS[accountType]} 포트폴리오
      </h2>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">총액</label>
        <input
          type="text"
          inputMode="numeric"
          value={amountDisplay}
          placeholder="0"
          onFocus={() => { totalFocused.current = true }}
          onBlur={() => { totalFocused.current = false }}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="w-56 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-right"
        />
        <span className="text-sm text-slate-500">원</span>
        {account.totalAmount > 0 && (
          <span className="text-sm text-slate-400">
            ({account.totalAmount >= 1_000_000_000_000
              ? `${(account.totalAmount / 1_000_000_000_000).toFixed(0)}조`
              : `${(account.totalAmount / 100_000_000).toFixed(0)}억`})
          </span>
        )}
      </div>

      {allocationOver && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          ⚠ 비중 합계가 {totalAllocation.toFixed(1)}%입니다. 100%를 초과할 수 없습니다.
        </div>
      )}

      {account.stocks.length > 0 && (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs">
                <th className="px-3 py-2 text-left">종목명</th>
                <th className="px-3 py-2 text-left">비중(%)</th>
                <th className="px-3 py-2 text-right">금액 (원)</th>
                <th className="px-3 py-2 text-left">주가성장률(%)</th>
                <th className="px-3 py-2 text-left">배당률(%)</th>
                <th className="px-3 py-2 text-left">배당성장(%)</th>
                <th className="px-3 py-2 text-left">배당주기</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {account.stocks.map((stock) => (
                <StockRow
                  key={stock.id}
                  stock={stock}
                  totalAmount={account.totalAmount}
                  onChange={(patch) => updateStock(accountType, stock.id, patch)}
                  onAmountChange={(amount) => setStockAmount(accountType, stock.id, amount)}
                  onRemove={() => removeStock(accountType, stock.id)}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="text-xs text-slate-500 border-t border-slate-200">
                <td className="px-3 py-2 font-medium">합계</td>
                <td className={`px-3 py-2 font-medium ${allocationOver ? 'text-red-600' : 'text-slate-700'}`}>
                  {totalAllocation.toFixed(1)}%
                </td>
                <td colSpan={6} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => addStock(accountType)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          + 종목 추가
        </button>
      </div>

      {account.stocks.length > 0 && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-800">배당 재투자</span>
            {(() => {
              const allocs = account.reinvestAllocations ?? []
              const total = allocs.reduce((s, a) => s + a.ratio, 0)
              if (allocs.length === 0) return null
              return Math.abs(total - 100) < 0.01
                ? <span className="text-xs text-emerald-600">✓ 합계 100%</span>
                : <span className="text-xs text-red-500">⚠ 비율 합계 {total.toFixed(1)}%</span>
            })()}
          </div>

          {(account.reinvestAllocations ?? []).length > 0 && (
            <div className="space-y-2 mb-2">
              {(account.reinvestAllocations ?? []).map((alloc) => (
                <div key={alloc.id} className="flex items-center gap-2">
                  <select
                    value={alloc.stockId}
                    onChange={(e) => updateReinvestAllocation(accountType, alloc.id, { stockId: e.target.value })}
                    className="flex-1 px-2 py-1.5 text-sm border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
                  >
                    <option value="">종목 선택</option>
                    {account.stocks.map((s) => (
                      <option key={s.id} value={s.id}>{s.name || '(이름 없음)'}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={alloc.ratio === 0 ? '' : alloc.ratio}
                    placeholder="0"
                    min={0}
                    max={100}
                    onChange={(e) => updateReinvestAllocation(accountType, alloc.id, { ratio: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-2 py-1.5 text-sm border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-400 text-right"
                  />
                  <span className="text-sm text-emerald-700">%</span>
                  <button
                    onClick={() => removeReinvestAllocation(accountType, alloc.id)}
                    className="text-emerald-400 hover:text-red-500 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => addReinvestAllocation(accountType)}
            className="text-xs px-2 py-1 border border-dashed border-emerald-400 text-emerald-700 rounded hover:bg-emerald-100 transition-colors"
          >
            + 종목 추가
          </button>
          {(account.reinvestAllocations ?? []).length === 0 && (
            <span className="ml-2 text-xs text-emerald-600">재투자 종목을 추가하세요</span>
          )}
        </div>
      )}
    </div>
  )
}
