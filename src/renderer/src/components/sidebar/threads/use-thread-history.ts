import type React from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/store'
import { getProjectHostSetupProjectionFromState } from '@/store/project-host-setup-selector'
import { useAllWorktrees, useRepos } from '@/store/selectors'
import { selectFolderWorkspaces, selectWorktreesByRepo } from '@/store/workspace-record-selectors'
import { isWebClientLocation } from '@/lib/web-client-location'
import { AI_VAULT_AGENTS, type AiVaultSession } from '../../../../../shared/ai-vault-types'
import type { AiVaultSearchHit } from '../../../../../shared/ai-vault-search-types'
import {
  ALL_EXECUTION_HOSTS_SCOPE,
  LOCAL_EXECUTION_HOST_ID,
  getRepoExecutionHostId,
  type ExecutionHostScope
} from '../../../../../shared/execution-host'
import { resolveAiVaultSearchSettings } from '../../../../../shared/ai-vault-search-settings'
import type { Worktree } from '../../../../../shared/worktree/types'
import { useAiVaultSessionRefresh } from '../../right-sidebar/ai-vault-session-refresh'
import { useAiVaultPanelSearch } from '../../right-sidebar/use-ai-vault-search'
import { useAiVaultPanelSessionResume } from '../../right-sidebar/use-ai-vault-panel-session-resume'
import { useAiVaultSessionLaunchActions } from '../../right-sidebar/ai-vault-session-launch-actions'
import { useAiVaultOriginalPaneActions } from '../../right-sidebar/ai-vault-original-pane-actions'

export type ThreadHistoryRow = {
  session: AiVaultSession
  worktree: Worktree
  hit?: AiVaultSearchHit
}

const NO_SCOPE_PATHS: readonly string[] = []
const HISTORY_SESSION_LIMIT = 250
const NOT_READY_RETRY_MS = 3_000

/** Past agent sessions (AI vault) mapped onto live workspaces; with a query, full-text conversation matches. */
export function useThreadHistory(query: string): {
  history: ThreadHistoryRow[]
  matches: ThreadHistoryRow[]
  searching: boolean
  searchLoading: boolean
  searchNotReady: boolean
  historyLoading: boolean
  resume: (row: ThreadHistoryRow) => void
} {
  const repos = useRepos()
  const allWorktrees = useAllWorktrees()
  const settings = useAppStore((s) => s.settings)
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const resumeTargetState = useAppStore(
    useShallow((state) => ({
      projectHostSetupProjection: getProjectHostSetupProjectionFromState(state),
      settings: state.settings,
      folderWorkspaces: selectFolderWorkspaces(state),
      projectGroups: state.projectGroups,
      repos: state.repos,
      worktreesByRepo: selectWorktreesByRepo(state)
    }))
  )
  // Remote projects need every host's history; local-only setups skip contacting other hosts.
  const executionHostScope: ExecutionHostScope = useMemo(
    () =>
      repos.some((repo) => getRepoExecutionHostId(repo) !== LOCAL_EXECUTION_HOST_ID)
        ? ALL_EXECUTION_HOSTS_SCOPE
        : LOCAL_EXECUTION_HOST_ID,
    [repos]
  )
  const list = useAiVaultSessionRefresh(NO_SCOPE_PATHS, executionHostScope, HISTORY_SESSION_LIMIT)
  const search = useAiVaultPanelSearch(
    query,
    AI_VAULT_AGENTS,
    undefined,
    executionHostScope,
    'relevance'
  )
  // The search hook returns a fresh retry each render; a ref keeps timers from resetting.
  const retryRef = useRef(search.retry)
  retryRef.current = search.retry
  useAutoEnableConversationSearch(search.needsLocalConsent, retryRef)

  const notReady = search.response?.kind === 'unavailable' && search.response.reason === 'not-ready'
  useEffect(() => {
    if (!notReady) {
      return
    }
    const timer = setTimeout(() => retryRef.current(), NOT_READY_RETRY_MS)
    return () => clearTimeout(timer)
  }, [notReady, search.response])

  const sessions = useMemo(
    () => [...list.sessions, ...search.sessions],
    [list.sessions, search.sessions]
  )
  const { getSessionWorktreeInfo, getSessionResumeState } = useAiVaultPanelSessionResume({
    sessions,
    repos,
    allWorktrees,
    workspaceId: activeWorktreeId,
    resumeTargetState,
    settings
  })
  const paneActions = useAiVaultOriginalPaneActions()
  const worktreeById = useMemo(
    () => new Map(allWorktrees.map((worktree) => [worktree.id, worktree])),
    [allWorktrees]
  )

  const toRow = useCallback(
    (session: AiVaultSession, hit?: AiVaultSearchHit): ThreadHistoryRow | null => {
      const info = getSessionWorktreeInfo(session)
      const worktree = info?.worktreeId ? worktreeById.get(info.worktreeId) : undefined
      // Archived/unknown folders cannot resume here; live sessions are already their thread.
      if (
        !worktree ||
        worktree.isArchived ||
        (info?.status !== 'active' && info?.status !== 'current')
      ) {
        return null
      }
      if (
        paneActions.getOriginalPaneTarget(session) ||
        paneActions.isStructuredSessionOpen(session)
      ) {
        return null
      }
      return hit ? { session, worktree, hit } : { session, worktree }
    },
    [getSessionWorktreeInfo, worktreeById, paneActions]
  )

  const history = useMemo(
    () =>
      list.sessions
        .filter((session) => session.messageCount > 0 && !session.subagent)
        .map((session) => toRow(session))
        .filter((row): row is ThreadHistoryRow => row !== null),
    [list.sessions, toRow]
  )
  const matches = useMemo(
    () =>
      search.sessions
        .map((session) => toRow(session, search.searchHits.get(session.id)))
        .filter((row): row is ThreadHistoryRow => row !== null),
    [search.sessions, search.searchHits, toRow]
  )

  const launchActions = useAiVaultSessionLaunchActions({
    activeWorktree: activeWorktreeId ? (worktreeById.get(activeWorktreeId) ?? null) : null,
    activeWorktreeId,
    targetState: resumeTargetState,
    agentCmdOverrides: settings?.agentCmdOverrides
  })
  const { handleResume } = launchActions
  const resume = useCallback(
    (row: ThreadHistoryRow) =>
      handleResume(row.session, getSessionResumeState(row.session).worktreeId ?? row.worktree.id),
    [handleResume, getSessionResumeState]
  )

  return {
    history,
    matches,
    searching: search.hasQuery,
    searchLoading: search.loading,
    searchNotReady: notReady || search.needsLocalConsent,
    historyLoading: list.loading,
    resume
  }
}

/** Threads search turns on the local transcript index the first time it is needed. */
function useAutoEnableConversationSearch(
  needsLocalConsent: boolean,
  retryRef: React.RefObject<() => void>
): void {
  const attempted = useRef(false)
  useEffect(() => {
    if (!needsLocalConsent || attempted.current || isWebClientLocation()) {
      return
    }
    attempted.current = true
    const store = useAppStore.getState()
    void store
      .updateSettingsOrThrow({
        aiVaultSearch: { ...resolveAiVaultSearchSettings(store.settings), enabled: true }
      })
      .then(() => {
        store.markFeatureTipsSeen(['agent-session-search'])
        retryRef.current()
      })
      .catch(console.error)
  }, [needsLocalConsent, retryRef])
}
