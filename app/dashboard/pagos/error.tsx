'use client'

import RouteErrorFallback from '@/components/route-error-fallback'

export default function PagosError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteErrorFallback error={error} reset={reset} />
}
