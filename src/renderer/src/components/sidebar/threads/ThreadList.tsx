import React, { useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useAppStore } from '@/store'
import { useRepoMap } from '@/store/repos/use-repository-catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/utils'
import { isActiveSidebarWorkspace } from '../../../../../shared/sidebar-list/active-workspace'
import type { ThreadRow } from './thread-rows'
import { ThreadCompactRow } from './ThreadCompactRow'
import { ThreadRowCard } from './ThreadRowCard'
import { useThreadListModel } from './use-thread-list-model'
import { useThreadDragDrop } from './use-thread-drag-drop'
import { useThreadHistory } from './use-thread-history'
import { ThreadHistoryRow } from './ThreadHistoryRow'
import { CollapsibleSectionHeader, SectionLabel, ShowMoreButton } from './thread-list-sections'
import { ThreadTagFilterBar } from './ThreadTagFilterBar'
import { ThreadTagDialog } from './ThreadTagDialog'
import { matchesThreadTagFilter } from '../../../../../shared/threads/thread-tags'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import type { ThreadHistoryRow as ThreadHistoryRowData } from './use-thread-history'
import { ThreadResumeContext } from './thread-resume-context'
import { useThreadAutoSettleObserver, useThreadOpenObserver } from './use-thread-open-observer'

const SETTLED_PAGE_SIZE = 10
const DROP_ZONE_ACTIVE_CLASS =
  'bg-worktree-sidebar-accent/40 ring-1 ring-inset ring-worktree-sidebar-ring/40'

export default function ThreadList(): React.JSX.Element {
  const t = useTranslate()
  useThreadOpenObserver(true)
  useThreadAutoSettleObserver(true)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const { rows, unfilteredRows } = useThreadListModel({ query })
  const tagFilter = useAppStore((s) => s.threadTagFilter)
  const threadTags = useAppStore((s) => s.threadTags)
  const setThreadTagFilter = useAppStore((s) => s.setThreadTagFilter)
  const tagFiltering = tagFilter.length > 0
  const snoozedCollapsed = useAppStore((s) => s.threadsSnoozedCollapsed)
  const setSnoozedCollapsed = useAppStore((s) => s.setThreadsSnoozedCollapsed)
  const settledCollapsed = useAppStore((s) => s.threadsSettledCollapsed)
  const setSettledCollapsed = useAppStore((s) => s.setThreadsSettledCollapsed)
  const [settledLimit, setSettledLimit] = useState(SETTLED_PAGE_SIZE)
  const historyCollapsed = useAppStore((s) => s.threadsHistoryCollapsed)
  const setHistoryCollapsed = useAppStore((s) => s.setThreadsHistoryCollapsed)
  const [historyLimit, setHistoryLimit] = useState(SETTLED_PAGE_SIZE)
  const threadHistory = useThreadHistory(query)
  const repoMap = useRepoMap()
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const activeHostId = useAppStore((s) => s.activeWorkspaceExecutionHostId)
  const openModal = useAppStore((s) => s.openModal)
  const searching = query.trim().length > 0

  const { draggingKey, dropTarget, startDrag, endDrag, dragOver, drop } = useThreadDragDrop(
    rows,
    threadHistory.resumeLatest
  )
  const canDrag = !searching

  const renderRow = (row: ThreadRow, draggable: boolean): React.JSX.Element => {
    const isActive = isActiveSidebarWorkspace(row.worktree, {
      worktreeId: activeWorktreeId,
      hostId: activeHostId ?? null
    })
    const indicator =
      dropTarget?.kind === 'row' && dropTarget.key === row.key ? dropTarget.position : null
    return (
      <div
        key={row.key}
        role="option"
        aria-selected={isActive}
        aria-current={isActive ? 'page' : undefined}
        data-thread-row-key={row.key}
        data-worktree-id={row.worktree.id}
        className={cn('relative px-1.5', draggingKey === row.key && 'opacity-40')}
        onDragOver={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
          dragOver({ kind: 'row', key: row.key, position })(event)
        }}
        onDrop={drop}
      >
        {indicator ? (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-2 z-10 h-0.5 rounded-full bg-ring',
              indicator === 'before' ? 'top-0' : 'bottom-0'
            )}
          />
        ) : null}
        <ThreadRowCard
          worktree={row.worktree}
          repo={repoMap.get(row.worktree.repoId)}
          isActive={isActive}
          draggable={draggable}
          onDragStart={() => startDrag(row.key)}
          onDragEnd={endDrag}
        />
      </div>
    )
  }

  const renderCompactRow = (row: ThreadRow): React.JSX.Element => (
    <div
      key={row.key}
      className={cn('px-1.5', draggingKey === row.key && 'opacity-40')}
      data-thread-row-key={row.key}
    >
      <ThreadCompactRow
        row={row}
        draggable={canDrag}
        onDragStart={() => startDrag(row.key)}
        onDragEnd={endDrag}
        repo={repoMap.get(row.worktree.repoId)}
        isActive={isActiveSidebarWorkspace(row.worktree, {
          worktreeId: activeWorktreeId,
          hostId: activeHostId ?? null
        })}
      />
    </div>
  )

  const empty =
    rows.pinned.length === 0 &&
    rows.rest.length === 0 &&
    rows.snoozed.length === 0 &&
    rows.settled.length === 0
  // A search shows every settled match; paging only trims the idle list.
  const visibleSettled = searching ? rows.settled : rows.settled.slice(0, settledLimit)
  const hiddenSettledCount = rows.settled.length - visibleSettled.length
  const filteredHistory = tagFiltering
    ? threadHistory.history.filter((row) =>
        matchesThreadTagFilter(
          tagFilter,
          threadTags,
          getWorktreeHostIdentity(row.worktree),
          row.worktree.repoId
        )
      )
    : threadHistory.history
  const visibleHistory = filteredHistory.slice(0, historyLimit)
  const hiddenHistoryCount = filteredHistory.length - visibleHistory.length

  const renderHistoryRow = (row: ThreadHistoryRowData): React.JSX.Element => (
    <div key={row.session.id} className="px-1.5">
      <ThreadHistoryRow
        row={row}
        repo={repoMap.get(row.worktree.repoId)}
        onResume={threadHistory.resume}
      />
    </div>
  )

  return (
    <ThreadResumeContext.Provider value={threadHistory.resumeLatest}>
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
              placeholder={t('components.sidebar.threads.search', 'Search')}
              aria-label={t('components.sidebar.threads.searchLabel', 'Search threads')}
            />
          </div>
        </div>
        <ThreadTagFilterBar rows={unfilteredRows} />
        <div className="min-h-0 flex-1 overflow-y-auto pb-2 scrollbar-sleek" role="listbox">
          <div className="flex min-h-full flex-col">
            <div
              className={cn(
                'flex flex-1 flex-col rounded-lg',
                dropTarget?.kind === 'open' && DROP_ZONE_ACTIVE_CLASS
              )}
              onDragOver={dragOver({ kind: 'open' })}
              onDrop={drop}
            >
              {empty && !searching && tagFiltering ? (
                <div className="flex flex-col items-center gap-2 px-4 pt-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t('components.sidebar.threads.tags.noMatches', 'No threads with these tags.')}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setThreadTagFilter([])}>
                    {t('components.sidebar.threads.tags.clearFilter', 'Clear filter')}
                  </Button>
                </div>
              ) : null}
              {empty && !searching && !tagFiltering ? (
                <div className="flex flex-col items-center gap-2 px-4 pt-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    {t('components.sidebar.threads.empty', 'No open threads.')}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => openModal('new-thread')}>
                    <Plus className="size-3.5" />
                    {t('components.sidebar.threads.newThread', 'New thread')}
                  </Button>
                </div>
              ) : null}
              {rows.pinned.length > 0 ? (
                <>
                  <SectionLabel>{t('components.sidebar.threads.pinned', 'Pinned')}</SectionLabel>
                  <div className="flex flex-col gap-1">
                    {rows.pinned.map((row) => renderRow(row, canDrag))}
                  </div>
                </>
              ) : null}
              {rows.rest.length > 0 ? (
                <div className={cn('flex flex-col gap-1', rows.pinned.length > 0 && 'mt-2')}>
                  {rows.rest.map((row) => renderRow(row, canDrag))}
                </div>
              ) : null}
            </div>
            <div className="pt-2">
              {rows.snoozed.length > 0 || draggingKey ? (
                <div
                  className={cn(
                    'rounded-lg',
                    dropTarget?.kind === 'snoozed' && DROP_ZONE_ACTIVE_CLASS
                  )}
                  onDragOver={dragOver({ kind: 'snoozed' })}
                  onDrop={drop}
                >
                  <CollapsibleSectionHeader
                    accent
                    label={t('components.sidebar.threads.snoozed', 'Snoozed')}
                    collapsed={snoozedCollapsed}
                    onToggle={() => setSnoozedCollapsed(!snoozedCollapsed)}
                  />
                  {snoozedCollapsed ? null : rows.snoozed.map(renderCompactRow)}
                </div>
              ) : null}
              {rows.settled.length > 0 || draggingKey ? (
                <div
                  className={cn(
                    'rounded-lg',
                    dropTarget?.kind === 'settled' && DROP_ZONE_ACTIVE_CLASS
                  )}
                  onDragOver={dragOver({ kind: 'settled' })}
                  onDrop={drop}
                >
                  <CollapsibleSectionHeader
                    label={t('components.sidebar.threads.settled', 'Settled')}
                    collapsed={settledCollapsed}
                    onToggle={() => setSettledCollapsed(!settledCollapsed)}
                  />
                  {settledCollapsed ? null : (
                    <>
                      {visibleSettled.map(renderCompactRow)}
                      {hiddenSettledCount > 0 ? (
                        <ShowMoreButton
                          count={hiddenSettledCount}
                          onClick={() => setSettledLimit((limit) => limit + SETTLED_PAGE_SIZE * 2)}
                        />
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
              {!searching && filteredHistory.length > 0 ? (
                <>
                  <CollapsibleSectionHeader
                    label={t('components.sidebar.threads.history', 'History')}
                    collapsed={historyCollapsed}
                    onToggle={() => setHistoryCollapsed(!historyCollapsed)}
                  />
                  {historyCollapsed ? null : (
                    <>
                      {visibleHistory.map(renderHistoryRow)}
                      {hiddenHistoryCount > 0 ? (
                        <ShowMoreButton
                          count={hiddenHistoryCount}
                          onClick={() => setHistoryLimit((limit) => limit + SETTLED_PAGE_SIZE * 2)}
                        />
                      ) : null}
                    </>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <ThreadTagDialog />
    </ThreadResumeContext.Provider>
  )
}
