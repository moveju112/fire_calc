import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Account, AccountType, FireTarget, Stock } from '../types'
import { ACCOUNT_TYPES } from '../types'

type PortfolioStore = {
  accounts: Record<AccountType, Account>
  fireTarget: FireTarget
  setTotalAmount: (accountType: AccountType, amount: number) => void
  addStock: (accountType: AccountType) => void
  updateStock: (accountType: AccountType, stockId: string, patch: Partial<Stock>) => void
  removeStock: (accountType: AccountType, stockId: string) => void
  setFireTarget: (patch: Partial<FireTarget>) => void
}

const defaultAccounts = (): Record<AccountType, Account> =>
  Object.fromEntries(
    ACCOUNT_TYPES.map((type) => [type, { type, totalAmount: 0, stocks: [] }])
  ) as unknown as Record<AccountType, Account>

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      accounts: defaultAccounts(),
      fireTarget: { targetAsset: 0, targetMonthlyExpense: 0 },

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
        set((state) => ({
          accounts: {
            ...state.accounts,
            [accountType]: {
              ...state.accounts[accountType],
              stocks: state.accounts[accountType].stocks.filter((s) => s.id !== stockId),
            },
          },
        })),

      setFireTarget: (patch) =>
        set((state) => ({
          fireTarget: { ...state.fireTarget, ...patch },
        })),
    }),
    { name: 'fire-calc-state' }
  )
)
