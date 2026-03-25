'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Lightweight client-side cache for API responses.
 * Avoids re-fetching on every navigation without adding SWR/React Query dependency.
 *
 * Features:
 * - In-memory cache with configurable TTL (default 60s)
 * - Stale-while-revalidate pattern (returns cached data immediately, refreshes in background)
 * - Deduplication of concurrent requests for the same key
 * - Manual refresh capability
 * - Max 200 entries with LRU eviction
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const MAX_ENTRIES = 200
const cache = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

function evictOldest() {
  if (cache.size <= MAX_ENTRIES) return
  // Delete the oldest entry (first inserted in Map iteration order)
  const firstKey = cache.keys().next().value
  if (firstKey !== undefined) cache.delete(firstKey)
}

interface UseCachedFetchOptions {
  /** Cache TTL in milliseconds (default: 60000 = 60s) */
  ttl?: number
  /** Auto-refresh interval in ms (0 = disabled). Respects document.visibilityState. */
  refreshInterval?: number
  /** Skip fetching (e.g. when orgId is not yet available) */
  skip?: boolean
}

interface UseCachedFetchResult<T> {
  data: T | null
  loading: boolean
  error: string
  /** True if showing cached data while revalidating */
  isStale: boolean
  /** Force refresh, ignoring cache */
  refresh: () => void
}

/**
 * useCachedFetch — SWR-like hook without external dependencies.
 *
 * @param key Unique cache key (e.g. `patients:${orgId}:${page}`)
 * @param fetcher Async function that returns data
 * @param options Configuration
 *
 * @example
 * const { data, loading, error, refresh } = useCachedFetch(
 *   `analytics:${orgId}:${days}`,
 *   () => fetchFullAnalytics(orgId, days, branchId),
 *   { ttl: 60000, refreshInterval: 60000 }
 * )
 */
export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedFetchOptions = {},
): UseCachedFetchResult<T> {
  const { ttl = 60_000, refreshInterval = 0, skip = false } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isStale, setIsStale] = useState(false)
  const mountedRef = useRef(true)
  const dataRef = useRef<T | null>(null)

  // Keep ref in sync so doFetch can read current data without depending on it
  dataRef.current = data

  const doFetch = useCallback(async (ignoreCache = false) => {
    if (skip) return

    // Check cache first (unless forced refresh)
    if (!ignoreCache) {
      const cached = cache.get(key) as CacheEntry<T> | undefined
      if (cached) {
        const age = Date.now() - cached.timestamp
        setData(cached.data)
        setError('')
        if (age < ttl) {
          // Fresh cache — no need to refetch
          setLoading(false)
          setIsStale(false)
          return
        }
        // Stale cache — show it while revalidating
        setIsStale(true)
        setLoading(false)
      }
    }

    // Deduplicate: if same key is already fetching, wait for it
    const existing = inflight.get(key) as Promise<T> | undefined
    if (existing) {
      try {
        const result = await existing
        if (mountedRef.current) {
          setData(result)
          setError('')
          setLoading(false)
          setIsStale(false)
        }
      } catch {
        // Let the original request handler deal with the error
      }
      return
    }

    if (!dataRef.current && !ignoreCache) setLoading(true)

    const promise = fetcher()
    inflight.set(key, promise)

    try {
      const result = await promise
      cache.set(key, { data: result, timestamp: Date.now() })
      evictOldest()
      if (mountedRef.current) {
        setData(result)
        setError('')
        setIsStale(false)
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : 'Error desconocido')
      }
    } finally {
      inflight.delete(key)
      if (mountedRef.current) setLoading(false)
    }
  }, [key, fetcher, ttl, skip])

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true
    doFetch()
    return () => { mountedRef.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, skip])

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || skip) return
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        doFetch(true)
      }
    }, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, skip, doFetch])

  const refresh = useCallback(() => {
    doFetch(true)
  }, [doFetch])

  return { data, loading, error, isStale, refresh }
}

/**
 * Invalidate cache entries matching a prefix.
 * Useful for optimistic updates: after mutation, invalidate related queries.
 *
 * @example
 * await createPatient(orgId, data)
 * invalidateCache(`patients:${orgId}`)
 */
export function invalidateCache(prefix: string) {
  const keys = Array.from(cache.keys())
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}
