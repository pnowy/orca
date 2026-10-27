import type React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { reorderThread } from '../../../../../shared/threads/thread-state'
import { reopenSettledThread, reopenThread, settleThread, snoozeThread } from './thread-actions'
import type { Worktree } from '../../../../../shared/worktree/types'
import type { ThreadRow, ThreadRows } from './thread-rows'

type ThreadSection = keyof ThreadRows

export type ThreadDropTarget =
  | { kind: 'row'; key: string; position: 'before' | 'after' }
  | { kind: 'open' | 'snoozed' | 'settled' }

function sameTarget(a: ThreadDropTarget | null, b: ThreadDropTarget): boolean {
  if (!a || a.kind !== b.kind) {
    return false
  }
  return a.kind !== 'row' || b.kind !== 'row' || (a.key === b.key && a.position === b.position)
}

/** Drag between sections: crossing Pinned pins, dropping in Snoozed/Settled snoozes/settles, dropping back reopens. */
export function useThreadDragDrop(
  rows: ThreadRows,
  resumeLatest: ((worktree: Worktree) => void) | null
): {
  draggingKey: string | null
  dropTarget: ThreadDropTarget | null
  startDrag: (key: string) => void
  endDrag: () => void
  dragOver: (target: ThreadDropTarget) => (event: React.DragEvent) => void
  drop: (event: React.DragEvent) => void
} {
  const replaceThreadStates = useAppStore((s) => s.replaceThreadStates)
  const setWorktreesPinnedAndReveal = useAppStore((s) => s.setWorktreesPinnedAndReveal)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<ThreadDropTarget | null>(null)

  const rowByKey = useMemo(() => {
    const map = new Map<string, { row: ThreadRow; section: ThreadSection }>()
    for (const section of ['pinned', 'rest', 'snoozed', 'settled'] as const) {
      for (const row of rows[section]) {
        map.set(row.key, { row, section })
      }
    }
    return map
  }, [rows])

  const endDrag = useCallback(() => {
    setDraggingKey(null)
    setDropTarget(null)
  }, [])

  const dragOver = useCallback(
    (target: ThreadDropTarget) => (event: React.DragEvent) => {
      if (!draggingKey) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      setDropTarget((current) => (sameTarget(current, target) ? current : target))
    },
    [draggingKey]
  )

  const drop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const moved = draggingKey ? rowByKey.get(draggingKey) : undefined
      const target = dropTarget
      endDrag()
      if (!moved || !target) {
        return
      }
      const { row, section } = moved
      if (target.kind === 'settled') {
        if (section !== 'settled') {
          settleThread(row.worktree)
        }
        return
      }
      if (target.kind === 'snoozed') {
        if (section !== 'snoozed') {
          snoozeThread(row.key, 'tomorrow')
        }
        return
      }
      const into = target.kind === 'row' ? rowByKey.get(target.key) : undefined
      if (into?.row.key === row.key) {
        return
      }
      if (section === 'settled') {
        reopenSettledThread(row.worktree, resumeLatest)
      } else if (section === 'snoozed') {
        reopenThread(row.key)
      }
      const intoPinned = into?.section === 'pinned'
      const keys = (intoPinned ? rows.pinned : rows.rest)
        .map((r) => r.key)
        .filter((key) => key !== row.key)
      const targetIndex = into ? keys.indexOf(into.row.key) : keys.length
      const toIndex =
        target.kind === 'row' && target.position === 'after' ? targetIndex + 1 : targetIndex
      replaceThreadStates(
        reorderThread(useAppStore.getState().threadStates, keys, row.key, toIndex)
      )
      if (Boolean(row.worktree.isPinned) !== intoPinned) {
        setWorktreesPinnedAndReveal([row.worktree], intoPinned)
      }
    },
    [
      draggingKey,
      dropTarget,
      rowByKey,
      rows,
      resumeLatest,
      endDrag,
      replaceThreadStates,
      setWorktreesPinnedAndReveal
    ]
  )

  return { draggingKey, dropTarget, startDrag: setDraggingKey, endDrag, dragOver, drop }
}
