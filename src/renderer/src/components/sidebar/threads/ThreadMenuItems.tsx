import React from 'react'
import { AlarmClock, AlarmClockOff, CircleCheck, PencilLine, RotateCcw } from 'lucide-react'
import { useAppStore } from '@/store'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { translate } from '@/i18n/i18n'
import { useTranslate } from '@/i18n/use-translate'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import { isThreadOpen, type ThreadSnoozeOption } from '../../../../../shared/threads/thread-state'
import { reopenSettledThread, settleThread, snoozeThread } from './thread-actions'
import { useThreadResume } from './thread-resume-context'
import { threadFallbackOpenedAt } from './thread-rows'

export const THREAD_SNOOZE_OPTIONS: { option: ThreadSnoozeOption; label: () => string }[] = [
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

/** Inline rename of the thread title; renders nothing outside the Threads layout. */
export function ThreadRenameMenuItem({
  worktree,
  disabled
}: {
  worktree: Worktree
  disabled: boolean
}): React.JSX.Element | null {
  const t = useTranslate()
  const threadsLayout = useAppStore((s) => s.sidebarLayout === 'threads')
  const setRenamingWorktreeId = useAppStore((s) => s.setRenamingWorktreeId)
  if (!threadsLayout) {
    return null
  }
  return (
    <DropdownMenuItem
      disabled={disabled}
      // Why: the menu refocuses the sidebar on close, which would blur and cancel an editor opened synchronously.
      onSelect={() => window.setTimeout(() => setRenamingWorktreeId(worktree.id), 0)}
    >
      <PencilLine className="size-3.5" />
      {t('components.sidebar.threads.rename', 'Rename')}
    </DropdownMenuItem>
  )
}

/** Snooze and Settle for a workspace card's menu; renders nothing outside the Threads layout. */
export function ThreadMenuItems({
  worktree,
  disabled
}: {
  worktree: Worktree
  disabled: boolean
}): React.JSX.Element | null {
  const t = useTranslate()
  const threadsLayout = useAppStore((s) => s.sidebarLayout === 'threads')
  const key = getWorktreeHostIdentity(worktree)
  const snoozedUntil = useAppStore((s) => s.threadStates?.[key]?.snoozedUntil ?? 0)
  const settled = useAppStore(
    (s) =>
      (s.threadStates?.[key]?.settledAt ?? 0) > 0 &&
      !isThreadOpen(s.threadStates?.[key], threadFallbackOpenedAt(worktree))
  )
  const updateThreadState = useAppStore((s) => s.updateThreadState)
  const resumeLatest = useThreadResume()
  if (!threadsLayout) {
    return null
  }

  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={disabled}>
          <AlarmClock className="size-3.5" />
          {t('components.sidebar.threads.snooze', 'Snooze')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {THREAD_SNOOZE_OPTIONS.map(({ option, label }) => (
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
          {t('components.sidebar.threads.unsnooze', 'Unsnooze')}
        </DropdownMenuItem>
      ) : null}
      {settled ? (
        <DropdownMenuItem
          disabled={disabled}
          onSelect={() => reopenSettledThread(worktree, resumeLatest)}
        >
          <RotateCcw className="size-3.5" />
          {t('components.sidebar.threads.reopen', 'Reopen')}
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem disabled={disabled} onSelect={() => settleThread(worktree)}>
          <CircleCheck className="size-3.5" />
          {t('components.sidebar.threads.settle', 'Settle')}
        </DropdownMenuItem>
      )}
    </>
  )
}
