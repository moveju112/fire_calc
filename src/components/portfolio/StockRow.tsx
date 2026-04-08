import { useState, useEffect, useRef } from 'react'
import type { DividendFrequency, Stock } from '../../types'

type Props = {
  stock: Stock
  totalAmount: number
  onChange: (patch: Partial<Stock>) => void
  onAmountChange: (amount: number) => void
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
  const [display, setDisplay] = useState(() => value === 0 ? '' : String(value))
  const focused = useRef(false)

  // 포커스 밖에 있을 때만 외부 값으로 동기화
  useEffect(() => {
    if (!focused.current) {
      setDisplay(value === 0 ? '' : String(value))
    }
  }, [value])

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={placeholder ?? '0'}
      onFocus={() => { focused.current = true }}
      onBlur={() => {
        focused.current = false
        const num = parseFloat(display)
        if (isNaN(num)) {
          setDisplay('')
          onChange(0)
        } else {
          setDisplay(String(num))
          onChange(num)
        }
      }}
      onChange={(e) => {
        const raw = e.target.value
        // 숫자, 소수점, 마이너스만 허용
        if (/^-?[0-9]*\.?[0-9]*$/.test(raw)) {
          setDisplay(raw)
          const num = parseFloat(raw)
          if (!isNaN(num)) onChange(num)
        }
      }}
      className={`w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 ${className ?? ''}`}
    />
  )
}

const FREQ_OPTIONS: { value: DividendFrequency; label: string }[] = [
  { value: 12, label: '월배당' },
  { value: 4, label: '분기' },
  { value: 1, label: '연배당' },
]

export function StockRow({ stock, totalAmount, onChange, onAmountChange, onRemove }: Props) {
  const derivedAmount = Math.round(totalAmount * (stock.allocation / 100))
  const freq = stock.dividendFrequency ?? 4

  const [amountDisplay, setAmountDisplay] = useState(() =>
    derivedAmount > 0 ? derivedAmount.toLocaleString('ko-KR') : ''
  )
  const amountFocused = useRef(false)

  // 포커스 밖에 있을 때만 외부 값(총액·비중 수정) 반영
  useEffect(() => {
    if (!amountFocused.current) {
      setAmountDisplay(derivedAmount > 0 ? derivedAmount.toLocaleString('ko-KR') : '')
    }
  }, [derivedAmount])

  const handleAmountChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '')
    const num = parseInt(digitsOnly, 10) || 0
    setAmountDisplay(num === 0 ? '' : num.toLocaleString('ko-KR'))
    onAmountChange(num)
  }

  const handleAmountBlur = () => {
    amountFocused.current = false
    // blur 시 실제 파생값으로 다시 sync (반올림 오차 정리)
    const synced = Math.round(totalAmount * (stock.allocation / 100))
    setAmountDisplay(synced > 0 ? synced.toLocaleString('ko-KR') : '')
  }

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
      <td className="px-3 py-2 w-36">
        <input
          type="text"
          inputMode="numeric"
          value={amountDisplay}
          placeholder="0"
          onFocus={() => { amountFocused.current = true }}
          onBlur={handleAmountBlur}
          onChange={(e) => handleAmountChange(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 text-right"
        />
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
      <td className="px-3 py-2 w-24">
        <select
          value={freq}
          onChange={(e) => onChange({ dividendFrequency: Number(e.target.value) as DividendFrequency })}
          className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
        >
          {FREQ_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
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
