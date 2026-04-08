import type { Account, AccountType, FireTarget, MonthlyContribution } from '../types'

export type PersistedState = {
  accounts: Record<AccountType, Account>
  fireTarget: FireTarget
  contributions: Record<AccountType, MonthlyContribution>
}

function toBase64Url(binary: string): string {
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64Url(encoded: string): string {
  const padded = encoded + '=='.slice(0, (4 - (encoded.length % 4)) % 4)
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

export function encodeState(state: PersistedState): string {
  const json = JSON.stringify(state)
  const bytes = new TextEncoder().encode(json)
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  return toBase64Url(binary)
}

export function decodeState(encoded: string): PersistedState | null {
  try {
    const binary = fromBase64Url(encoded)
    const bytes = Uint8Array.from(binary.split('').map((c) => c.charCodeAt(0)))
    const json = new TextDecoder().decode(bytes)
    return JSON.parse(json) as PersistedState
  } catch {
    return null
  }
}

export function readHashState(): PersistedState | null {
  const hash = window.location.hash
  if (!hash.startsWith('#!')) return null
  return decodeState(hash.slice(2))
}

export function writeHashState(state: PersistedState): void {
  const encoded = encodeState(state)
  history.replaceState(null, '', `#!${encoded}`)
}

export function clearHash(): void {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}
