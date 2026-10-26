import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useAppStore } from '@/store'
import { getRepoMapFromState } from '@/store/selectors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { isActiveSidebarWorkspace } from '../../../../../shared/sidebar-list/active-workspace'
import { reorderThread } from '../../../../../shared/threads/thread-state'
import WorktreeCard from '../WorktreeCard'
import type { ThreadRow } from './thread-rows'
import { useThreadListModel } from './use-thread-list-model'
import { useThreadOpenObserver } from './use-thread-open-observer'

type DropTarget = { key: string; position: 'before' | 'after' }

function SectionLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="px-3 pb-1 pt-2 text-[11px] font-medium text-muted-foreground select-none">
      {children}
    </div>
  )
}

export default function ThreadList(): React.JSX.Element {
  useThreadOpenObserver(true)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const showSnoozed = useAppStore((s) => s.threadsShowSnoozed)
  const showSettled = useAppStore((s) => s.threadsShowSettled)
  const { rows } = useThreadListModel({ query, showSnoozed, showSettled })
  const repos = useAppStore((s) => s.repos)
  const repoMap = useMemo(() => getRepoMapFromState({ repos }), [repos])
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const activeHostId = useAppStore((s) => s.activeWorkspaceExecutionHostId)
  const openModal = useAppStore((s) => s.openModal)
  const replaceThreadStates = useAppStore((s) => s.replaceThreadStates)
  const setWorktreesPinnedAndReveal = useAppStore((s) => s.setWorktreesPinnedAndReveal)
  const searching = query.trim().length > 0

  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const rowByKey = useMemo(() => {
    const map = new Map<string, { row: ThreadRow; pinned: boolean }>()
    for (const row of rows.pinned) {
      map.set(row.key, { row, pinned: true })
    }
    for (const row of rows.rest) {
      map.set(row.key, { row, pinned: false })
    }
    return map
  }, [rows])

  const handleDrop = useCallback(
    (target: DropTarget) => {
      const moved = draggingKey ? rowByKey.get(draggingKey) : undefined
      const into = rowByKey.get(target.key)
      setDraggingKey(null)
      setDropTarget(null)
      if (!moved || !into || moved.row.key === into.row.key) {
        return
      }
      const section = (into.pinned ? rows.pinned : rows.rest)
        .map((row) => row.key)
        .filter((key) => key !== moved.row.key)
      const targetIndex = section.indexOf(into.row.key)
      const toIndex = target.position === 'after' ? targetIndex + 1 : targetIndex
      replaceThreadStates(
        reorderThread(useAppStore.getState().threadStates, section, moved.row.key, toIndex)
      )
      // Crossing the Pinned boundary is how a drag pins or unpins.
      if (moved.pinned !== into.pinned) {
        setWorktreesPinnedAndReveal([moved.row.worktree], into.pinned)
      }
    },
    [draggingKey, rowByKey, rows, replaceThreadStates, setWorktreesPinnedAndReveal]
  )

  const renderRow = (row: ThreadRow, draggable: boolean): React.JSX.Element => {
    const isActive = isActiveSidebarWorkspace(row.worktree, {
      worktreeId: activeWorktreeId,
      hostId: activeHostId ?? null
    })
    const indicator = dropTarget?.key === row.key ? dropTarget.position : null
    return (
      <div
        key={row.key}
        role="option"
        aria-selected={isActive}
        aria-current={isActive ? 'page' : undefined}
        data-thread-row-key={row.key}
        data-worktree-id={row.worktree.id}
        className={cn(
          'relative px-1.5',
          row.kind !== 'open' && 'opacity-60',
          draggingKey === row.key && 'opacity-40'
        )}
        onDragOver={
          draggable && draggingKey
            ? (event) => {
                event.preventDefault()
                const rect = event.currentTarget.getBoundingClientRect()
                const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
                if (dropTarget?.key !== row.key || dropTarget.position !== position) {
                  setDropTarget({ key: row.key, position })
                }
              }
            : undefined
        }
        onDrop={
          draggable && draggingKey
            ? (event) => {
                event.preventDefault()
                if (dropTarget) {
                  handleDrop(dropTarget)
                }
              }
            : undefined
        }
      >
        {indicator ? (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-2 z-10 h-0.5 rounded-full bg-ring',
              indicator === 'before' ? 'top-0' : 'bottom-0'
            )}
          />
        ) : null}
        <WorktreeCard
          worktree={row.worktree}
          repo={repoMap.get(row.worktree.repoId)}
          isActive={isActive}
          showProjectName
          inPinnedSection={row.worktree.isPinned}
          nativeDragEnabled={draggable}
          onCardDragStart={() => setDraggingKey(row.key)}
          onCardDragEnd={() => {
            setDraggingKey(null)
            setDropTarget(null)
          }}
        />
      </div>
    )
  }

  const empty = rows.pinned.length === 0 && rows.rest.length === 0 && rows.dimmed.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-sidebar-threads-list="">
      <div className="shrink-0 px-2 pb-1.5 pt-1">
        <div className="flex items-center gap-1.5">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <Input
            density="compact"
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && query) {
                event.preventDefault()
                event.stopPropagation()
                setQuery('')
              }
            }}
            placeholder={translate('components.sidebar.threads.search', 'Search')}
            aria-label={translate('components.sidebar.threads.searchLabel', 'Search threads')}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2 scrollbar-sleek" role="listbox">
        {empty ? (
          <div className="flex flex-col items-center gap-2 px-4 pt-8 text-center">
            <p className="text-xs text-muted-foreground">
              {searching
                ? translate('components.sidebar.threads.noMatches', 'No threads match.')
                : translate('components.sidebar.threads.empty', 'No open threads.')}
            </p>
            {searching ? null : (
              <Button size="sm" variant="outline" onClick={() => openModal('new-thread')}>
                <Plus className="size-3.5" />
                {translate('components.sidebar.threads.newThread', 'New thread')}
              </Button>
            )}
          </div>
        ) : null}
        {rows.pinned.length > 0 ? (
          <>
            <SectionLabel>{translate('components.sidebar.threads.pinned', 'Pinned')}</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {rows.pinned.map((row) => renderRow(row, !searching))}
            </div>
          </>
        ) : null}
        {rows.rest.length > 0 ? (
          <div className={cn('flex flex-col gap-0.5', rows.pinned.length > 0 && 'mt-2')}>
            {rows.rest.map((row) => renderRow(row, !searching))}
          </div>
        ) : null}
        {rows.dimmed.length > 0 ? (
          <>
            <SectionLabel>
              {translate('components.sidebar.threads.snoozedAndSettled', 'Snoozed and settled')}
            </SectionLabel>
            <div className="flex flex-col gap-0.5">
              {rows.dimmed.map((row) => renderRow(row, false))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
