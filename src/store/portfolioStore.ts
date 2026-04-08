import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Account, AccountType, ContributionAllocation, FireTarget, MonthlyContribution, ReinvestAllocation, Stock } from '../types'
import { ACCOUNT_TYPES } from '../types'

type PortfolioStore = {
  accounts: Record<AccountType, Account>
  fireTarget: FireTarget
  contributions: Record<AccountType, MonthlyContribution>
  setTotalAmount: (accountType: AccountType, amount: number) => void
  addStock: (accountType: AccountType) => void
  updateStock: (accountType: AccountType, stockId: string, patch: Partial<Stock>) => void
  removeStock: (accountType: AccountType, stockId: string) => void
  setStockAmount: (accountType: AccountType, stockId: string, amount: number) => void
  addReinvestAllocation: (accountType: AccountType) => void
  updateReinvestAllocation: (accountType: AccountType, allocId: string, patch: Partial<ReinvestAllocation>) => void
  removeReinvestAllocation: (accountType: AccountType, allocId: string) => void
  setFireTarget: (patch: Partial<FireTarget>) => void
  setContributionAmount: (accountType: AccountType, amount: number) => void
  addContributionAllocation: (accountType: AccountType) => void
  updateContributionAllocation: (accountType: AccountType, allocId: string, patch: Partial<ContributionAllocation>) => void
  removeContributionAllocation: (accountType: AccountType, allocId: string) => void
}

const defaultAccounts = (): Record<AccountType, Account> =>
  Object.fromEntries(
    ACCOUNT_TYPES.map((type) => [type, { type, totalAmount: 0, stocks: [], reinvestAllocations: [] }])
  ) as unknown as Record<AccountType, Account>

const defaultContributions = (): Record<AccountType, MonthlyContribution> =>
  Object.fromEntries(
    ACCOUNT_TYPES.map((type) => [type, { accountType: type, monthlyAmount: 0, allocations: [] }])
  ) as unknown as Record<AccountType, MonthlyContribution>

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      accounts: defaultAccounts(),
      fireTarget: { targetAsset: 0, targetMonthlyExpense: 0 },
      contributions: defaultContributions(),

      setTotalAmount: (accountType, amount) =>
        set((state) => ({
          accounts: {
            ...state.accounts,
            [accountType]: { ...state.accounts[accountType], totalAmount: amount },
          },
        })),

      addStock: (accountType) =>
        set((state) => ({
          accounts: {
            ...state.accounts,
            [accountType]: {
              ...state.accounts[accountType],
              stocks: [
                ...state.accounts[accountType].stocks,
                {
                  id: uuidv4(),
                  name: '',
                  allocation: 0,
                  annualGrowth: 0,
                  dividendYield: 0,
                  dividendGrowth: 0,
                  dividendFrequency: 4,
                },
              ],
            },
          },
        })),

      updateStock: (accountType, stockId, patch) =>
        set((state) => ({
          accounts: {
            ...state.accounts,
            [accountType]: {
              ...state.accounts[accountType],
              stocks: state.accounts[accountType].stocks.map((s) =>
                s.id === stockId ? { ...s, ...patch } : s
              ),
            },
          },
        })),

      removeStock: (accountType, stockId) =>
        set((state) => {
          const account = state.accounts[accountType]
          const contribution = state.contributions[accountType]
          return {
            accounts: {
              ...state.accounts,
              [accountType]: {
                ...account,
                stocks: account.stocks.filter((s) => s.id !== stockId),
                reinvestAllocations: (account.reinvestAllocations ?? []).filter((a) => a.stockId !== stockId),
              },
            },
            contributions: {
              ...state.contributions,
              [accountType]: {
                ...contribution,
                allocations: contribution.allocations.filter((a) => a.stockId !== stockId),
              },
            },
          }
        }),

      setStockAmount: (accountType, stockId, amount) =>
        set((state) => {
          const account = state.accounts[accountType]
          const amounts = account.stocks.map((s) => ({
            id: s.id,
            value: s.id === stockId ? amount : account.totalAmount * (s.allocation / 100),
          }))
          const newTotal = amounts.reduce((sum, a) => sum + a.value, 0)
          return {
            accounts: {
              ...state.accounts,
              [accountType]: {
                ...account,
                totalAmount: newTotal,
                stocks: account.stocks.map((s) => {
                  const a = amounts.find((x) => x.id === s.id)!
                  return { ...s, allocation: newTotal > 0 ? (a.value / newTotal) * 100 : 0 }
                }),
              },
            },
          }
        }),

      addReinvestAllocation: (accountType) =>
        set((state) => ({
          accounts: {
            ...state.accounts,
            [accountType]: {
              ...state.accounts[accountType],
              reinvestAllocations: [
                ...(state.accounts[accountType].reinvestAllocations ?? []),
                { id: uuidv4(), stockId: '', ratio: 0 },
              ],
            },
          },
        })),

      updateReinvestAllocation: (accountType, allocId, patch) =>
        set((state) => ({
          accounts: {
            ...state.accounts,
            [accountType]: {
              ...state.accounts[accountType],
              reinvestAllocations: (state.accounts[accountType].reinvestAllocations ?? []).map((a) =>
                a.id === allocId ? { ...a, ...patch } : a
              ),
            },
          },
        })),

      removeReinvestAllocation: (accountType, allocId) =>
        set((state) => ({
          accounts: {
            ...state.accounts,
            [accountType]: {
              ...state.accounts[accountType],
              reinvestAllocations: (state.accounts[accountType].reinvestAllocations ?? []).filter(
                (a) => a.id !== allocId
              ),
            },
          },
        })),

      setFireTarget: (patch) =>
        set((state) => ({
          fireTarget: { ...state.fireTarget, ...patch },
        })),

      setContributionAmount: (accountType, amount) =>
        set((state) => ({
          contributions: {
            ...state.contributions,
            [accountType]: { ...state.contributions[accountType], monthlyAmount: amount },
          },
        })),

      addContributionAllocation: (accountType) =>
        set((state) => ({
          contributions: {
            ...state.contributions,
            [accountType]: {
              ...state.contributions[accountType],
              allocations: [
                ...state.contributions[accountType].allocations,
                { id: uuidv4(), stockId: '', ratio: 0 },
              ],
            },
          },
        })),

      updateContributionAllocation: (accountType, allocId, patch) =>
        set((state) => ({
          contributions: {
            ...state.contributions,
            [accountType]: {
              ...state.contributions[accountType],
              allocations: state.contributions[accountType].allocations.map((a) =>
                a.id === allocId ? { ...a, ...patch } : a
              ),
            },
          },
        })),

      removeContributionAllocation: (accountType, allocId) =>
        set((state) => ({
          contributions: {
            ...state.contributions,
            [accountType]: {
              ...state.contributions[accountType],
              allocations: state.contributions[accountType].allocations.filter((a) => a.id !== allocId),
            },
          },
        })),
    }),
    { name: 'fire-calc-state' }
  )
)
