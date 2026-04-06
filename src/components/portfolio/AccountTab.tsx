import { usePortfolioStore } from '../../store/portfolioStore'
import { StockRow } from './StockRow'
import { ACCOUNT_LABELS, type AccountType } from '../../types'

type Props = { accountType: AccountType }

export function AccountTab({ accountType }: Props) {
  const account = usePortfolioStore((s) => s.accounts[accountType])
  const setTotalAmount = usePortfolioStore((s) => s.setTotalAmount)
  const addStock = usePortfolioStore((s) => s.addStock)
  const updateStock = usePortfolioStore((s) => s.updateStock)
  const removeStock = usePortfolioStore((s) => s.removeStock)

  const totalAllocation = account.stocks.reduce((sum, s) => sum + s.allocation, 0)
  const allocationOver = totalAllocation > 100

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        {ACCOUNT_LABELS[accountType]} 포트폴리오
      </h2>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">총액</label>
        <input
          type="number"
          value={account.totalAmount === 0 ? '' : account.totalAmount}
          placeholder="0"
          onChange={(e) => setTotalAmount(accountType, parseFloat(e.target.value) || 0)}
          className="w-56 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <span className="text-sm text-slate-500">원</span>
        {account.totalAmount > 0 && (
          <span className="text-sm text-slate-400">
            ({(account.totalAmount / 100_000_000).toFixed(2)}억)
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
                <th className="px-3 py-2 text-right">금액</th>
                <th className="px-3 py-2 text-left">성장률(%)</th>
                <th className="px-3 py-2 text-left">배당률(%)</th>
                <th className="px-3 py-2 text-left">배당성장(%)</th>
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
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <button
        onClick={() => addStock(accountType)}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        + 종목 추가
      </button>
    </div>
  )
}
