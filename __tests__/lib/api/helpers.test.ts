// __tests__/lib/api/helpers.test.ts
// Tests for helpers: withBranch, formatCurrency, formatCOP, formatUSD,
// formatNumber, formatPercent, timeAgo

import { withBranch, formatCurrency, formatCOP, formatUSD, formatNumber, formatPercent, timeAgo } from '@/lib/api/helpers'

describe('withBranch', () => {
  it('returns url unchanged when branchId is null', () => {
    expect(withBranch('/api/test', null)).toBe('/api/test')
  })

  it('returns url unchanged when branchId is undefined', () => {
    expect(withBranch('/api/test')).toBe('/api/test')
  })

  it('returns url unchanged when branchId is empty string', () => {
    expect(withBranch('/api/test', '')).toBe('/api/test')
  })

  it('appends branch_id with ? when no query params exist', () => {
    expect(withBranch('/api/test', 'b-1')).toBe('/api/test?branch_id=b-1')
  })

  it('appends branch_id with & when query params already exist', () => {
    expect(withBranch('/api/test?limit=10', 'b-1')).toBe('/api/test?limit=10&branch_id=b-1')
  })

  it('handles complex URLs with multiple params', () => {
    expect(withBranch('/api/test?a=1&b=2', 'br-99')).toBe('/api/test?a=1&b=2&branch_id=br-99')
  })
})

describe('formatCurrency', () => {
  it('formats COP number by default', () => {
    const result = formatCurrency(50000)
    expect(result).toMatch(/50/)
  })

  it('formats large numbers with compact notation', () => {
    const result = formatCurrency(1_500_000)
    expect(result).toMatch(/1[.,]5/)
  })

  it('returns $0 for NaN', () => {
    expect(formatCurrency(NaN)).toBe('$0')
  })

  it('returns $0 for null-like value', () => {
    expect(formatCurrency(null as unknown as number)).toBe('$0')
  })

  it('formats USD correctly', () => {
    const result = formatCurrency(100, 'USD', 'en-US')
    expect(result).toMatch(/100/)
  })

  it('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/0/)
  })

  it('handles small amounts without compact notation', () => {
    const result = formatCurrency(999_999)
    expect(result).toBeDefined()
  })
})

describe('formatCOP', () => {
  it('formats as COP', () => {
    const result = formatCOP(100000)
    expect(result).toMatch(/100/)
  })
})

describe('formatUSD', () => {
  it('formats as USD', () => {
    const result = formatUSD(50)
    expect(result).toMatch(/50/)
  })
})

describe('formatNumber', () => {
  it('formats with locale', () => {
    const result = formatNumber(1234)
    expect(result).toMatch(/1[.,]234/)
  })

  it('returns 0 for falsy value', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatPercent', () => {
  it('formats with one decimal', () => {
    expect(formatPercent(85.67)).toBe('85.7%')
  })

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('handles falsy value', () => {
    expect(formatPercent(undefined as unknown as number)).toBe('0.0%')
  })
})

describe('timeAgo', () => {
  it('returns "ahora" for recent timestamps', () => {
    const now = new Date().toISOString()
    expect(timeAgo(now)).toBe('ahora')
  })

  it('returns minutes for timestamps < 1h ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(timeAgo(fiveMinAgo)).toMatch(/hace \d+m/)
  })

  it('returns hours for timestamps < 24h ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(timeAgo(twoHoursAgo)).toMatch(/hace \d+h/)
  })

  it('returns days for timestamps < 7d ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(timeAgo(threeDaysAgo)).toMatch(/hace \d+d/)
  })

  it('returns formatted date for timestamps > 7d ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const result = timeAgo(twoWeeksAgo)
    // Should be a date string like "8 mar" or similar
    expect(result).not.toMatch(/hace/)
  })
})
