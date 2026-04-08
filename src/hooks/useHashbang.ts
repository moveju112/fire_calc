import { useEffect, useState } from 'react'
import { usePortfolioStore } from '../store/portfolioStore'
import { readHashState, writeHashState, clearHash, type PersistedState } from '../utils/hashState'

const LS_KEY = 'fire-calc-hashbang'

export function useHashbang() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(LS_KEY) === 'true')

  const accounts = usePortfolioStore((s) => s.accounts)
  const fireTarget = usePortfolioStore((s) => s.fireTarget)
  const contributions = usePortfolioStore((s) => s.contributions)

  // 마운트 시 URL에 해시뱅이 있으면 스토어에 덮어씀
  useEffect(() => {
    const hashState = readHashState()
    if (hashState) {
      usePortfolioStore.setState(hashState)
      setEnabled(true)
      localStorage.setItem(LS_KEY, 'true')
    }
  }, [])

  // enabled 상태이면 스토어 변경 시마다 URL 갱신
  useEffect(() => {
    if (!enabled) return
    const state: PersistedState = { accounts, fireTarget, contributions }
    writeHashState(state)
  }, [enabled, accounts, fireTarget, contributions])

  function toggle() {
    setEnabled((prev) => {
      const next = !prev
      localStorage.setItem(LS_KEY, String(next))
      if (!next) clearHash()
      return next
    })
  }

  return { enabled, toggle }
}
