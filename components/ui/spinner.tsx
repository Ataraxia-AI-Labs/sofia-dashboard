import clsx from 'clsx'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles = {
  sm: 'w-4 h-4 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-[3px]',
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div className={clsx(
      'rounded-full animate-spin border-current/30 border-t-current',
      sizeStyles[size],
      className,
    )} />
  )
}
// Pipeline test - CodeRabbit verification
