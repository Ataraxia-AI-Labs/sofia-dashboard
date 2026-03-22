// __tests__/lib/hooks/use-cached-fetch.test.ts

import { renderHook, act, waitFor } from '@testing-library/react'
import { useCachedFetch, invalidateCache } from '@/lib/hooks/use-cached-fetch'

describe('useCachedFetch', () => {
  beforeEach(() => {
    // Clear internal cache between tests
    invalidateCache('')
  })

  it('returns loading true initially', () => {
    const fetcher = jest.fn().mockResolvedValue({ result: 'ok' })
    const { result } = renderHook(() => useCachedFetch('test-key-1', fetcher))
    // Initially loading
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
  })

  it('returns data after fetch completes', async () => {
    const fetcher = jest.fn().mockResolvedValue({ patients: [1, 2, 3] })
    const { result } = renderHook(() => useCachedFetch('test-key-2', fetcher))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.data).toEqual({ patients: [1, 2, 3] })
    expect(result.current.error).toBe('')
  })

  it('returns error on fetch failure', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useCachedFetch('test-key-3', fetcher))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.error).toBe('Network error')
  })

  it('skips fetching when skip=true', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: 'ok' })
    const { result } = renderHook(() => useCachedFetch('test-key-4', fetcher, { skip: true }))

    // Give it some time
    await new Promise((r) => setTimeout(r, 50))
    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(true) // stays loading since no fetch
  })

  it('returns cached data on second render with same key', async () => {
    const fetcher = jest.fn().mockResolvedValue({ cached: true })
    const { result, unmount } = renderHook(() => useCachedFetch('test-key-5', fetcher, { ttl: 60000 }))

    await waitFor(() => expect(result.current.loading).toBe(false))
    unmount()

    // Second render with same key should use cache
    const fetcher2 = jest.fn().mockResolvedValue({ cached: false })
    const { result: result2 } = renderHook(() => useCachedFetch('test-key-5', fetcher2, { ttl: 60000 }))

    await waitFor(() => expect(result2.current.loading).toBe(false))
    expect(result2.current.data).toEqual({ cached: true }) // from cache
    expect(fetcher2).not.toHaveBeenCalled()
  })

  it('refresh ignores cache', async () => {
    const fetcher = jest.fn()
      .mockResolvedValueOnce({ version: 1 })
      .mockResolvedValueOnce({ version: 2 })

    const { result } = renderHook(() => useCachedFetch('test-key-6', fetcher, { ttl: 60000 }))

    await waitFor(() => expect(result.current.data).toEqual({ version: 1 }))

    act(() => result.current.refresh())

    await waitFor(() => expect(result.current.data).toEqual({ version: 2 }))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('handles non-Error exception', async () => {
    const fetcher = jest.fn().mockRejectedValue('string error')
    const { result } = renderHook(() => useCachedFetch('test-key-7', fetcher))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Error desconocido')
  })
})

describe('invalidateCache', () => {
  it('invalidates entries matching prefix', async () => {
    const fetcher1 = jest.fn().mockResolvedValue({ v: 1 })
    const { result, unmount } = renderHook(() => useCachedFetch('patients:org-1:page1', fetcher1, { ttl: 60000 }))
    await waitFor(() => expect(result.current.data).toEqual({ v: 1 }))
    unmount()

    // Invalidate all patient entries
    invalidateCache('patients:org-1')

    // Next fetch should not use cache
    const fetcher2 = jest.fn().mockResolvedValue({ v: 2 })
    const { result: result2 } = renderHook(() => useCachedFetch('patients:org-1:page1', fetcher2, { ttl: 60000 }))
    await waitFor(() => expect(result2.current.data).toEqual({ v: 2 }))
    expect(fetcher2).toHaveBeenCalled()
  })
})
