import { ACCOUNT_LABELS, ACCOUNT_TYPES, type AccountType, type MonthlyContribution, type YearlyProjection } from '../types'
import type { Account } from '../types'
import type { FireTarget } from '../types'
import { calcAllAccountsProjection } from './projection'

export type PromptOptions = {
    includeAccounts: Record<AccountType, boolean>
    includeContributionTab: boolean
    includeFireSummary: boolean
    includeProjectionSummary: boolean
}

export function createDefaultPromptOptions(): PromptOptions {
    return {
        includeAccounts: {
            isa: true,
            pension: true,
            irp: true,
            overseas: true,
            domestic: true,
        },
        includeContributionTab: true,
        includeFireSummary: false,
        includeProjectionSummary: false,
    }
}

function formatCurrency(value: number): string {
    return `${Math.round(value).toLocaleString('ko-KR')}원`
}

function formatPercent(value: number): string {
    return `${value.toLocaleString('ko-KR')}%`
}

function formatFrequency(dividendFrequency: 1 | 4 | 12): string {
    if (dividendFrequency === 12) return '월배당'
    if (dividendFrequency === 4) return '분기배당'
    return '연배당'
}

function buildStockLines(account: Account): string {
    if (account.stocks.length === 0) {
        return '- 종목 없음'
    }

    return account.stocks
        .map((stock, index) => {
            const stockAmount = account.totalAmount * (stock.allocation / 100)
            return [
                `- 종목 ${index + 1}: ${stock.name || '(이름 없음)'}`,
                `  - 현재 평가금액: ${formatCurrency(stockAmount)}`,
                `  - 비중: ${formatPercent(stock.allocation)}`,
                `  - 연간 주가성장률: ${formatPercent(stock.annualGrowth)}`,
                `  - 연간 배당률: ${formatPercent(stock.dividendYield)}`,
                `  - 연간 배당성장률: ${formatPercent(stock.dividendGrowth)}`,
                `  - 배당주기: ${formatFrequency(stock.dividendFrequency ?? 12)}`,
            ].join('\n')
        })
        .join('\n')
}

function buildReinvestLines(account: Account): string {
    const reinvestAllocations = account.reinvestAllocations ?? []

    if (reinvestAllocations.length === 0) {
        return '- 설정 없음'
    }

    return reinvestAllocations
        .map((allocation) => {
            const stock = account.stocks.find((item) => item.id === allocation.stockId)
            return `- ${stock?.name || '(이름 없음)'}: ${formatPercent(allocation.ratio)}`
        })
        .join('\n')
}

function buildContributionLines(account: Account, contribution: MonthlyContribution): string {
    if (contribution.monthlyAmount <= 0) {
        return '- 월 납입 없음'
    }

    const allocationLines =
        contribution.allocations.length === 0
            ? '- 종목 배분 없음'
            : contribution.allocations
                  .map((allocation) => {
                      const stock = account.stocks.find((item) => item.id === allocation.stockId)
                      const allocationAmount = contribution.monthlyAmount * (allocation.ratio / 100)
                      return `- ${stock?.name || '(이름 없음)'}: ${formatPercent(allocation.ratio)} (${formatCurrency(allocationAmount)}/월)`
                  })
                  .join('\n')

    return [
        `- 월 납입액: ${formatCurrency(contribution.monthlyAmount)}`,
        allocationLines,
    ].join('\n')
}

function hasAccountData(account: Account): boolean {
    return account.totalAmount > 0 || account.stocks.length > 0 || (account.reinvestAllocations?.length ?? 0) > 0
}

function hasContributionData(contribution: MonthlyContribution): boolean {
    return contribution.monthlyAmount > 0 || contribution.allocations.length > 0
}

function buildProjectionSummary(projections: YearlyProjection[]): string {
    const targetYears = [1, 5, 10, 20]

    return targetYears
        .map((year) => {
            const projection = projections.find((item) => item.year === year)

            if (!projection) {
                return `- ${year}년 후 데이터 없음`
            }

            return [
                `- ${year}년 후`,
                `  - 총자산: ${formatCurrency(projection.totalAsset)}`,
                `  - 세전 연간 배당: ${formatCurrency(projection.dividendBeforeTax)}`,
                `  - 세후 연간 배당: ${formatCurrency(projection.dividendAfterTax)}`,
                `  - 세후 월 배당 추정: ${formatCurrency(projection.dividendAfterTax / 12)}`,
            ].join('\n')
        })
        .join('\n')
}

function buildFireSummary(
    projections: YearlyProjection[],
    accounts: Account[],
    fireTarget: FireTarget
): string {
    const currentAsset = accounts.reduce((sum, account) => sum + account.totalAmount, 0)
    const requiredByExpense =
        fireTarget.targetMonthlyExpense > 0
            ? (fireTarget.targetMonthlyExpense * 12) / 0.04
            : 0
    const effectiveTarget = Math.max(fireTarget.targetAsset, requiredByExpense)
    const fireYear = projections.find((projection) => projection.totalAsset >= effectiveTarget)?.year ?? null

    return [
        `- 현재 총자산: ${formatCurrency(currentAsset)}`,
        `- 목표 총자산: ${formatCurrency(fireTarget.targetAsset)}`,
        `- 목표 월 지출: ${formatCurrency(fireTarget.targetMonthlyExpense)}`,
        `- 4% 룰 기준 필요 자산: ${formatCurrency(requiredByExpense)}`,
        `- 실질 목표 자산: ${formatCurrency(effectiveTarget)}`,
        `- 예상 FIRE 달성 시점: ${fireYear ? `${fireYear}년 후` : '20년 내 미달성'}`,
    ].join('\n')
}

function buildAccountSection(accountType: AccountType, accounts: Record<AccountType, Account>): string {
    const account = accounts[accountType]

    return [
        `[${ACCOUNT_LABELS[accountType]}]`,
        `- 현재 총액: ${formatCurrency(account.totalAmount)}`,
        '- 보유 종목',
        buildStockLines(account),
        '- 배당 재투자 설정',
        buildReinvestLines(account),
    ].join('\n')
}

export function buildPortfolioPrompt(
    accounts: Record<AccountType, Account>,
    contributions: Record<AccountType, MonthlyContribution>,
    fireTarget: FireTarget,
    options: PromptOptions
): string {
    const accountList = Object.values(accounts)
    const projections = calcAllAccountsProjection(accountList, contributions)
    const activeAccountTypes = ACCOUNT_TYPES.filter(
        (accountType) => options.includeAccounts[accountType] && hasAccountData(accounts[accountType])
    )
    const activeContributionTypes = options.includeContributionTab
        ? ACCOUNT_TYPES.filter((accountType) => hasContributionData(contributions[accountType]))
        : []
    const accountSections = activeAccountTypes.map((accountType) => buildAccountSection(accountType, accounts))
    const contributionSections = activeContributionTypes.map((accountType) => {
        const account = accounts[accountType]
        const contribution = contributions[accountType]

        return [
            `[${ACCOUNT_LABELS[accountType]} 월 납입]`,
            buildContributionLines(account, contribution),
        ].join('\n')
    })
    const hasAnyData = accountSections.length > 0 || contributionSections.length > 0

    return [
        '아래 내용은 배당 투자 기반 FIRE 계산기의 현재 입력 상태와 계산 규칙이다.',
        '이 데이터를 기준으로 포트폴리오 분석, 계좌별 세후 현금흐름, 리밸런싱 아이디어, 종목 교체 아이디어, 위험요인 점검을 해줘.',
        '가능하면 숫자를 직접 인용해서 설명하고, 데이터가 부족하면 추가로 확인할 질문도 함께 제안해줘.',
        '',
        '[분석 요청 가이드]',
        '- 이 계산기는 배당 투자 중심 가정이다.',
        '- 무배당 성장주 관점이 아니라 배당과 세후 현금흐름 중심으로 해석해줘.',
        '- 답변할 때 계좌별 세금 차이, 재투자 효과, 월 납입 효과를 분리해서 설명해줘.',
        '',
        '[프로젝트 계산 규칙]',
        '- 예측 기간은 현재 포함 별도 표기 없이 향후 20년 시뮬레이션이다.',
        '- 주가성장률은 매월 복리로 적용한다.',
        '- 월 납입금은 매월 초 동일 금액이 납입되고, 설정된 종목 비율대로 배분된다.',
        '- 납입 비율 합계가 100%를 초과하면 내부적으로 100%가 되도록 비례 축소한다.',
        '- 배당 재투자 비율 합계가 100%를 초과하면 내부적으로 100%가 되도록 비례 축소한다.',
        '- 배당성장률이 0%가 아니면 현재가 기준 배당률은 `현재 배당률 x ((1+배당성장률)/(1+주가성장률))^연차`로 계산한다.',
        '- 배당성장률이 0%이면 현재가 대비 배당률을 고정으로 본다.',
        '- 배당주기는 월배당 12회, 분기배당 4회, 연배당 1회로 처리한다.',
        '- 재투자는 세후 금액 기준이다. 단, 연금저축과 IRP는 과세이연이므로 운용 중에는 세전 배당 전액이 재투자된다.',
        '- ISA는 연간 세전 배당 누적 200만원까지 비과세, 초과분은 9.9% 분리과세다.',
        '- 해외직투 배당세율은 15%, 국내투자 배당세율은 15.4%다.',
        '- 연금저축과 IRP는 표시용 세후 배당 계산 시 3.3%를 적용하지만, 재투자 자체는 세전 기준으로 이뤄진다.',
        '- ISA 연간 납입 한도, ISA 풍차돌리기, IRP/연금저축 세액공제 한도는 반영하지 않는다.',
        '',
        ...(options.includeFireSummary
            ? [
                  '[현재 FIRE 목표]',
                  buildFireSummary(projections, accountList, fireTarget),
                  '',
              ]
            : []),
        ...(options.includeProjectionSummary
            ? [
                  '[20년 예측 주요 스냅샷]',
                  buildProjectionSummary(projections),
                  '',
              ]
            : []),
        '[현재 입력 데이터]',
        ...(hasAnyData ? [...accountSections, ...contributionSections] : ['- 현재 입력된 ISA/연금저축/IRP/해외직투/국내투자/월 납입 데이터가 없다.']),
    ].join('\n')
}
