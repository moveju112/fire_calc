import { useState } from 'react'
import { Header } from './components/layout/Header'
import { TabNav, type TabId } from './components/layout/TabNav'
import { AccountTab } from './components/portfolio/AccountTab'
import { ProjectionTab } from './components/projection/ProjectionTab'
import { FireCalculator } from './components/fire/FireCalculator'
import { ACCOUNT_TYPES, type AccountType } from './types'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('isa')

  function renderContent() {
    if (activeTab === 'projection') return <ProjectionTab />
    if (activeTab === 'fire') return <FireCalculator />
    if (ACCOUNT_TYPES.includes(activeTab as AccountType)) {
      return <AccountTab accountType={activeTab as AccountType} />
    }
    return null
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header />
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1">{renderContent()}</main>
    </div>
  )
}
