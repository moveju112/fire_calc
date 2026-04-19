import { useState } from 'react'
import { usePortfolioStore } from '../../store/portfolioStore'
import {
  buildPortfolioPrompt,
  createDefaultPromptOptions,
  type PromptOptions,
} from '../../utils/promptBuilder'
import { PromptModal } from './PromptModal'

type Props = {
  hashbangEnabled: boolean
  onHashbangToggle: () => void
}

export function Header({ hashbangEnabled, onHashbangToggle }: Props) {
  const [copied, setCopied] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [promptOptions, setPromptOptions] = useState<PromptOptions>(createDefaultPromptOptions)
  const accounts = usePortfolioStore((s) => s.accounts)
  const contributions = usePortfolioStore((s) => s.contributions)
  const fireTarget = usePortfolioStore((s) => s.fireTarget)

  const promptText = buildPortfolioPrompt(accounts, contributions, fireTarget, promptOptions)

  function copyUrl() {
    const url = window.location.href

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => fallbackCopy(url))
    } else {
      fallbackCopy(url)
    }
  }

  function fallbackCopy(text: string) {
    const el = document.createElement('textarea')
    el.value = text
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.focus()
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <header className="bg-slate-900 text-white px-6 py-4 shadow-lg flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">📈 FIRE 계산기</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
            <span className="text-slate-300">URL 공유</span>
            <button
              onClick={onHashbangToggle}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                hashbangEnabled ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  hashbangEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
          <button
            onClick={() => setIsPromptModalOpen(true)}
            className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            프롬프트 생성
          </button>
          {hashbangEnabled && (
            <button
              onClick={copyUrl}
              className="px-3 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              {copied ? '복사됨 ✓' : 'URL 복사'}
            </button>
          )}
        </div>
      </header>

      <PromptModal
        isOpen={isPromptModalOpen}
        promptText={promptText}
        onClose={() => setIsPromptModalOpen(false)}
        options={promptOptions}
        onOptionsChange={setPromptOptions}
      />
    </>
  )
}
