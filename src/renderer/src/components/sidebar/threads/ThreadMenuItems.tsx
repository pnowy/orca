import React from 'react'
import { AlarmClock, AlarmClockOff, CircleCheck } from 'lucide-react'
import { useAppStore } from '@/store'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import type { ThreadSnoozeOption } from '../../../../../shared/threads/thread-state'
import { settleThread, snoozeThread } from './thread-actions'

const SNOOZE_OPTIONS: { option: ThreadSnoozeOption; label: () => string }[] = [
  { option: 'hour', label: () => translate('components.sidebar.threads.snoozeHour', '1 hour') },
  {
    option: 'three-hours',
    label: () => translate('components.sidebar.threads.snoozeThreeHours', '3 hours')
  },
  {
    option: 'tomorrow',
    label: () => translate('components.sidebar.threads.snoozeTomorrow', 'Tomorrow, 9:00')
  },
  {
    option: 'next-week',
    label: () => translate('components.sidebar.threads.snoozeNextWeek', 'Next Monday, 9:00')
  }
]

/** Snooze and Settle for a workspace card's menu; renders nothing outside the Threads layout. */
export function ThreadMenuItems({
  worktree,
  disabled
}: {
  worktree: Worktree
  disabled: boolean
}): React.JSX.Element | null {
  const threadsLayout = useAppStore((s) => s.sidebarLayout === 'threads')
  const key = getWorktreeHostIdentity(worktree)
  const snoozedUntil = useAppStore((s) => s.threadStates?.[key]?.snoozedUntil ?? 0)
  const updateThreadState = useAppStore((s) => s.updateThreadState)
  if (!threadsLayout) {
    return null
  }

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={disabled}>
          <AlarmClock className="size-3.5" />
          {translate('components.sidebar.threads.snooze', 'Snooze')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {SNOOZE_OPTIONS.map(({ option, label }) => (
            <DropdownMenuItem key={option} onSelect={() => snoozeThread(key, option)}>
              {label()}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      {snoozedUntil > 0 ? (
        <DropdownMenuItem
          disabled={disabled}
          onSelect={() => updateThreadState(key, { snoozedUntil: undefined })}
        >
          <AlarmClockOff className="size-3.5" />
          {translate('components.sidebar.threads.unsnooze', 'Unsnooze')}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem disabled={disabled} onSelect={() => settleThread(worktree)}>
        <CircleCheck className="size-3.5" />
        {translate('components.sidebar.threads.settle', 'Settle')}
      </DropdownMenuItem>
    </>
  )
}
