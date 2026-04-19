import { useEffect, useState } from 'react'
import type { PromptOptions } from '../../utils/promptBuilder'
import { ACCOUNT_LABELS, ACCOUNT_TYPES } from '../../types'

type Props = {
    isOpen: boolean
    promptText: string
    onClose: () => void
    options: PromptOptions
    onOptionsChange: (options: PromptOptions) => void
}

export function PromptModal({ isOpen, promptText, onClose, options, onOptionsChange }: Props) {
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!isOpen) return

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    useEffect(() => {
        if (!isOpen) {
            setCopied(false)
        }
    }, [isOpen])

    if (!isOpen) {
        return null
    }

    function fallbackCopy(text: string) {
        const element = document.createElement('textarea')
        element.value = text
        element.style.position = 'fixed'
        element.style.opacity = '0'
        document.body.appendChild(element)
        element.focus()
        element.select()
        document.execCommand('copy')
        document.body.removeChild(element)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
    }

    function copyPrompt() {
        if (navigator.clipboard) {
            navigator.clipboard
                .writeText(promptText)
                .then(() => {
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 2000)
                })
                .catch(() => fallbackCopy(promptText))
            return
        }

        fallbackCopy(promptText)
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">AI 프롬프트 생성</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            현재 포트폴리오와 계산 규칙을 포함한 질문용 프롬프트입니다.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-md px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                    >
                        닫기
                    </button>
                </div>

                <div className="px-5 py-4">
                    <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        {ACCOUNT_TYPES.map((accountType) => (
                            <label
                                key={accountType}
                                className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none"
                            >
                                <input
                                    type="checkbox"
                                    checked={options.includeAccounts[accountType]}
                                    onChange={(event) =>
                                        onOptionsChange({
                                            ...options,
                                            includeAccounts: {
                                                ...options.includeAccounts,
                                                [accountType]: event.target.checked,
                                            },
                                        })
                                    }
                                />
                                <span>{ACCOUNT_LABELS[accountType]} 추가</span>
                            </label>
                        ))}
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={options.includeContributionTab}
                                onChange={(event) =>
                                    onOptionsChange({
                                        ...options,
                                        includeContributionTab: event.target.checked,
                                    })
                                }
                            />
                            <span>월 납입 추가</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={options.includeFireSummary}
                                onChange={(event) =>
                                    onOptionsChange({
                                        ...options,
                                        includeFireSummary: event.target.checked,
                                    })
                                }
                            />
                            <span>현재 FIRE 목표 추가</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={options.includeProjectionSummary}
                                onChange={(event) =>
                                    onOptionsChange({
                                        ...options,
                                        includeProjectionSummary: event.target.checked,
                                    })
                                }
                            />
                            <span>20년 예측 주요 스냅샷 추가</span>
                        </label>
                    </div>
                    <textarea
                        readOnly
                        value={promptText}
                        className="h-[60vh] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 focus:outline-none"
                    />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                    <p className="text-xs text-slate-400">
                        체크박스로 원하는 섹션만 포함해서 복사할 수 있습니다.
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={copyPrompt}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        >
                            {copied ? '복사됨 ✓' : '프롬프트 복사'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
