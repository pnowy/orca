import React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { OptionsFilterCountBadge } from '../options-filter-count-badge'

export function ThreadOptionsMenu(): React.JSX.Element {
  const showSnoozed = useAppStore((s) => s.threadsShowSnoozed)
  const setShowSnoozed = useAppStore((s) => s.setThreadsShowSnoozed)
  const showSettled = useAppStore((s) => s.threadsShowSettled)
  const setShowSettled = useAppStore((s) => s.setThreadsShowSettled)
  const label = translate('components.sidebar.threads.options', 'Thread options')

  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              type="button"
              className="relative"
              aria-label={label}
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={2.25} />
              <OptionsFilterCountBadge count={Number(showSnoozed) + Number(showSettled)} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {label}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-56">
        <DropdownMenuCheckboxItem
          checked={showSnoozed}
          onCheckedChange={(checked) => setShowSnoozed(checked === true)}
          onSelect={(event) => event.preventDefault()}
        >
          {translate('components.sidebar.threads.showSnoozed', 'Show snoozed threads')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showSettled}
          onCheckedChange={(checked) => setShowSettled(checked === true)}
          onSelect={(event) => event.preventDefault()}
        >
          {translate('components.sidebar.threads.showSettled', 'Show settled threads')}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
