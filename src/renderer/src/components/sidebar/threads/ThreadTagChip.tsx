import React from 'react'
import { cn } from '@/lib/utils'

export function ThreadTagDot({ color }: { color: string }): React.JSX.Element {
  return (
    <span
      aria-hidden
      className="size-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

/** Toggleable filter chip; `leading` replaces the color dot (e.g. a project glyph). */
export const ThreadTagChip = React.forwardRef<
  HTMLButtonElement,
  {
    label: string
    color?: string
    leading?: React.ReactNode
    count?: number
    selected: boolean
    onToggle: () => void
  } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>
>(function ThreadTagChip(
  { label, color, leading, count, selected, onToggle, className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-5 max-w-40 shrink-0 items-center gap-1 rounded-full border px-2 text-2xs outline-none focus-visible:ring-1 focus-visible:ring-ring',
        selected
          ? 'border-ring/60 bg-accent text-foreground'
          : 'border-border text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        className
      )}
      onClick={onToggle}
      {...props}
    >
      {leading ?? (color ? <ThreadTagDot color={color} /> : null)}
      <span className="truncate">{label}</span>
      {count !== undefined ? <span className="tabular-nums opacity-60">{count}</span> : null}
    </button>
  )
})
