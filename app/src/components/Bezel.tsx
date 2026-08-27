import type { MouseEvent, ReactNode } from 'react'

export function Bezel({
  inset = false,
  className = '',
  children,
  onClick,
}: {
  inset?: boolean
  className?: string
  children?: ReactNode
  onClick?: (e: MouseEvent<HTMLDivElement>) => void
}) {
  return (
    <div className={`${inset ? 'bezel-in' : 'bezel-out'} ${className}`.trim()} onClick={onClick}>
      {children}
    </div>
  )
}
