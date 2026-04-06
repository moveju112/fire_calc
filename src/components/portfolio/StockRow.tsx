import type { Stock } from '../../types'

type Props = {
  stock: Stock
  totalAmount: number
  onChange: (patch: Partial<Stock>) => void
  onRemove: () => void
}

function NumInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: number
  onChange: (v: number) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="number"
      value={value === 0 ? '' : value}
      placeholder={placeholder ?? '0'}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={`w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${className ?? ''}`}
    />
  )
}

export function StockRow({ stock, totalAmount, onChange, onRemove }: Props) {
  const amount = totalAmount * (stock.allocation / 100)

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-2">
        <input
          type="text"
          value={stock.name}
          placeholder="종목명"
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </td>
      <td className="px-3 py-2 w-24">
        <NumInput value={stock.allocation} onChange={(v) => onChange({ allocation: v })} placeholder="%" />
      </td>
      <td className="px-3 py-2 w-36 text-sm text-slate-500 text-right">
        {amount > 0 ? `${Math.round(amount).toLocaleString()}원` : '-'}
      </td>
      <td className="px-3 py-2 w-24">
        <NumInput value={stock.annualGrowth} onChange={(v) => onChange({ annualGrowth: v })} placeholder="%" />
      </td>
      <td className="px-3 py-2 w-24">
        <NumInput value={stock.dividendYield} onChange={(v) => onChange({ dividendYield: v })} placeholder="%" />
      </td>
      <td className="px-3 py-2 w-24">
        <NumInput value={stock.dividendGrowth} onChange={(v) => onChange({ dividendGrowth: v })} placeholder="%" />
      </td>
      <td className="px-3 py-2 w-12 text-center">
        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </td>
    </tr>
  )
}
