import { ACCOUNT_LABELS, ACCOUNT_TYPES, type AccountType } from '../../types'

export type TabId = AccountType | 'contribution' | 'projection' | 'fire'

const ANALYSIS_TABS: { id: TabId; label: string }[] = [
  { id: 'contribution', label: '월 납입' },
  { id: 'projection', label: '예측 분석' },
  { id: 'fire', label: 'FIRE 계산' },
]

type Props = {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function TabNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="bg-white border-b border-slate-200 px-4 flex flex-wrap gap-1 pt-2">
      <div className="flex gap-1 mr-4">
        {ACCOUNT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onTabChange(type)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
              activeTab === type
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {ACCOUNT_LABELS[type]}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {ANALYSIS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
