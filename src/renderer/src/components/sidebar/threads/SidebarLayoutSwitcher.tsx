import React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import type { SidebarLayout } from '../../../../../shared/threads/thread-state'

/** The sidebar title doubles as the Projects/Threads switch, keeping the header's icon row unchanged. */
export function SidebarLayoutSwitcher({
  projectsTitle,
  projectsSectionKey
}: {
  projectsTitle: string
  projectsSectionKey: 'projects' | 'workspaces'
}): React.JSX.Element {
  const layout = useAppStore((s) => s.sidebarLayout)
  const setLayout = useAppStore((s) => s.setSidebarLayout)
  const setSidebarBody = useAppStore((s) => s.setSidebarBody)
  const threadsTitle = translate('components.sidebar.threads.title', 'Threads')
  const options: { value: SidebarLayout; label: string }[] = [
    { value: 'projects', label: projectsTitle },
    { value: 'threads', label: threadsTitle }
  ]

  const select = (value: SidebarLayout): void => {
    setLayout(value)
    // Picking a layout asks to see that list, not the Agents view.
    setSidebarBody('workspaces')
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 items-center gap-0.5 rounded-sm pl-2 pr-1 text-xs font-semibold text-muted-foreground/80 outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={translate('components.sidebar.threads.switchLayout', 'Switch sidebar layout')}
        >
          <span
            className="min-w-0 truncate select-none"
            data-sidebar-section-title={layout === 'threads' ? 'threads' : projectsSectionKey}
          >
            {layout === 'threads' ? threadsTitle : projectsTitle}
          </span>
          <ChevronDown className="size-3 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="w-40">
        {options.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => select(option.value)}>
            <Check className={option.value === layout ? 'size-3.5' : 'size-3.5 opacity-0'} />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
