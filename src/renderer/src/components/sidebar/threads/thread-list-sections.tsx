import React from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/utils'

/** T3-style collapsible divider: label, rule, chevron. */
export function CollapsibleSectionHeader({
  label,
  collapsed,
  onToggle,
  accent = false
}: {
  label: string
  collapsed: boolean
  onToggle: () => void
  accent?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2 px-3 pb-1 pt-3 text-xs outline-none select-none focus-visible:ring-1 focus-visible:ring-ring',
        accent ? 'text-callout-note' : 'text-muted-foreground'
      )}
      aria-expanded={!collapsed}
      onClick={onToggle}
    >
      <span className="shrink-0">{label}</span>
      <span className={cn('h-px flex-1', accent ? 'bg-callout-note/40' : 'bg-border')} />
      <ChevronDown
        className={cn('size-3.5 shrink-0 transition-transform', collapsed && '-rotate-90')}
      />
    </button>
  )
}

export function ShowMoreButton({
  count,
  onClick
}: {
  count: number
  onClick: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="px-1.5">
      <button
        type="button"
        className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-sm text-muted-foreground outline-none worktree-sidebar-card-hover focus-visible:ring-1 focus-visible:ring-ring"
        onClick={onClick}
      >
        <Plus className="size-3.5 opacity-60" />
        {t('components.sidebar.threads.showMore', 'Show {{count}} more', { count })}
      </button>
    </div>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="px-3 pb-1 pt-2 text-2xs font-medium text-muted-foreground select-none">
      {children}
    </div>
  )
}
