import React from 'react'
import { formatShortTimeAgo } from '@/lib/short-time-ago'
import { useNow } from '@/hooks/use-now'
import { AgentTypeIcon } from '@/lib/agent-type-icon'
import type { Repo } from '../../../../../shared/repo-types'
import { highlightedSearchSnippet } from '../../right-sidebar/AiVaultSearchEvidence'
import { conversationRoleLabel } from '../../right-sidebar/ai-vault-session-row-display'
import type { ThreadHistoryRow as ThreadHistoryRowData } from './use-thread-history'
import { ThreadProjectGlyph, threadTitle } from './thread-project-identity'

function sessionActivityAt(row: ThreadHistoryRowData): number {
  const at = Date.parse(row.session.updatedAt ?? row.session.modifiedAt)
  return Number.isFinite(at) ? at : 0
}

/** A past agent session: project, title and age; a search match adds the "You:/Agent:" snippet. */
export const ThreadHistoryRow = React.memo(function ThreadHistoryRow({
  row,
  repo,
  onResume
}: {
  row: ThreadHistoryRowData
  repo: Repo | undefined
  onResume: (row: ThreadHistoryRowData) => void
}): React.JSX.Element {
  const now = useNow(60_000)
  const at = sessionActivityAt(row)
  const evidence = row.hit?.evidence
  const title = row.session.title.trim() || threadTitle(row.worktree)

  return (
    <button
      type="button"
      className="flex w-full min-w-0 flex-col gap-0.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-muted-foreground outline-none select-none worktree-sidebar-card-hover focus-visible:ring-1 focus-visible:ring-ring"
      title={`${threadTitle(row.worktree)} · ${row.session.agent}`}
      onClick={() => onResume(row)}
    >
      <span className="flex w-full min-w-0 items-center gap-2">
        <span className="opacity-60">
          <ThreadProjectGlyph repo={repo} />
        </span>
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="inline-flex shrink-0 opacity-60">
          <AgentTypeIcon agentType={row.session.agent} size={12} />
        </span>
        {at > 0 ? (
          <span className="shrink-0 text-xs tabular-nums">{formatShortTimeAgo(at, now)}</span>
        ) : null}
      </span>
      {evidence ? (
        <span className="block w-full min-w-0 truncate pl-5.5 text-xs">
          <span className={evidence.role === 'user' ? 'text-callout-note' : 'text-status-success'}>
            {conversationRoleLabel(evidence.role)}:
          </span>{' '}
          {highlightedSearchSnippet(evidence.snippet)}
        </span>
      ) : null}
    </button>
  )
})
