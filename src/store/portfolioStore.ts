import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type {
  Account,
  AccountType,
  ContributionAllocation,
  ConversionAllocation,
  ConversionStrategy,
  FireTarget,
  MonthlyContribution,
  ReinvestAllocation,
  Stock,
} from '../types'
import { ACCOUNT_TYPES } from '../types'

type PortfolioStore = {
  accounts: Record<AccountType, Account>
  fireTarget: FireTarget
  contributions: Record<AccountType, MonthlyContribution>
  setTotalAmount: (accountType: AccountType, amount: number) => void
  addStock: (accountType: AccountType, initialPatch?: Partial<Stock>) => string
  updateStock: (accountType: AccountType, stockId: string, patch: Partial<Stock>) => void
  removeStock: (accountType: AccountType, stockId: string) => void
  setStockAmount: (accountType: AccountType, stockId: string, amount: number) => void
  addReinvestAllocation: (accountType: AccountType) => void
  updateReinvestAllocation: (accountType: AccountType, allocId: string, patch: Partial<ReinvestAllocation>) => void
  removeReinvestAllocation: (accountType: AccountType, allocId: string) => void
  setConversionStrategy: (accountType: AccountType, patch: Partial<ConversionStrategy>) => void
  toggleConversionSourceStock: (accountType: AccountType, stockId: string) => void
  addConversionAllocation: (accountType: AccountType, initialPatch?: Partial<ConversionAllocation>) => string
  updateConversionAllocation: (accountType: AccountType, allocId: string, patch: Partial<ConversionAllocation>) => void
  removeConversionAllocation: (accountType: AccountType, allocId: string) => void
  setFireTarget: (patch: Partial<FireTarget>) => void
  setContributionAmount: (accountType: AccountType, amount: number) => void
  addContributionAllocation: (accountType: AccountType) => void
  updateContributionAllocation: (accountType: AccountType, allocId: string, patch: Partial<ContributionAllocation>) => void
  removeContributionAllocation: (accountType: AccountType, allocId: string) => void
}

function createDefaultConversionStrategy(): ConversionStrategy {
  return {
    enabled: false,
    conversionYear: 10,
    sellRatio: 100,
    sourceStockIds: [],
    allocations: [],
  }
}

const defaultAccounts = (): Record<AccountType, Account> =>
  Object.fromEntries(
    ACCOUNT_TYPES.map((type) => [
      type,
      {
        type,
        totalAmount: 0,
        stocks: [],
        reinvestAllocations: [],
        conversionStrategy: createDefaultConversionStrategy(),
      },
    ])
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

      addStock: (accountType, initialPatch) => {
        const stockId = uuidv4()
        set((state) => ({
          accounts: {
            ...state.accounts,
            [accountType]: {
              ...state.accounts[accountType],
              stocks: [
                ...state.accounts[accountType].stocks,
                {
                  id: stockId,
                  name: '',
                  allocation: 0,
                  annualGrowth: 0,
                  dividendYield: 0,
                  dividendGrowth: 0,
                  dividendFrequency: 12,
                  ...initialPatch,
                },
              ],
            },
          },
        }))
        return stockId
      },

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
                conversionStrategy: {
                  ...(account.conversionStrategy ?? createDefaultConversionStrategy()),
                  sourceStockIds: (account.conversionStrategy?.sourceStockIds ?? []).filter((id) => id !== stockId),
                  allocations: (account.conversionStrategy?.allocations ?? []).filter((a) => a.stockId !== stockId),
                },
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

      setConversionStrategy: (accountType, patch) =>
        set((state) => ({
          accounts: {
            ...state.accounts,
            [accountType]: {
              ...state.accounts[accountType],
              conversionStrategy: {
                ...(state.accounts[accountType].conversionStrategy ?? createDefaultConversionStrategy()),
                ...patch,
              },
            },
          },
        })),

      toggleConversionSourceStock: (accountType, stockId) =>
        set((state) => {
          const account = state.accounts[accountType]
          const strategy = account.conversionStrategy ?? createDefaultConversionStrategy()
          return {
            accounts: {
              ...state.accounts,
              [accountType]: {
                ...account,
                conversionStrategy: {
                  ...strategy,
                  sourceStockIds: strategy.sourceStockIds.includes(stockId)
                    ? strategy.sourceStockIds.filter((id) => id !== stockId)
                    : [...strategy.sourceStockIds, stockId],
                },
              },
            },
          }
        }),

      addConversionAllocation: (accountType, initialPatch) => {
        const allocationId = uuidv4()
        set((state) => {
          const account = state.accounts[accountType]
          const strategy = account.conversionStrategy ?? createDefaultConversionStrategy()
          return {
            accounts: {
              ...state.accounts,
              [accountType]: {
                ...account,
                conversionStrategy: {
                  ...strategy,
                  allocations: [
                    ...strategy.allocations,
                    { id: allocationId, stockId: '', ratio: 0, ...initialPatch },
                  ],
                },
              },
            },
          }
        })
        return allocationId
      },

      updateConversionAllocation: (accountType, allocId, patch) =>
        set((state) => {
          const account = state.accounts[accountType]
          const strategy = account.conversionStrategy ?? createDefaultConversionStrategy()
          return {
            accounts: {
              ...state.accounts,
              [accountType]: {
                ...account,
                conversionStrategy: {
                  ...strategy,
                  allocations: strategy.allocations.map((allocation) =>
                    allocation.id === allocId ? { ...allocation, ...patch } : allocation
                  ),
                },
              },
            },
          }
        }),

      removeConversionAllocation: (accountType, allocId) =>
        set((state) => {
          const account = state.accounts[accountType]
          const strategy = account.conversionStrategy ?? createDefaultConversionStrategy()
          return {
            accounts: {
              ...state.accounts,
              [accountType]: {
                ...account,
                conversionStrategy: {
                  ...strategy,
                  allocations: strategy.allocations.filter((allocation) => allocation.id !== allocId),
                },
              },
            },
          }
        }),

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
