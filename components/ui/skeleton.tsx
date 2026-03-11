import clsx from 'clsx'

interface SkeletonProps {
  className?: string
}

/**
 * Reusable skeleton placeholder for loading states.
 * Use Tailwind `h-*` and `w-*` classes to control size.
 *
 * @example
 * <Skeleton className="h-4 w-40" />
 * <Skeleton className="h-10 w-10 rounded-full" />
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={clsx('bg-surface-3 rounded animate-pulse', className)}
    />
  )
}
