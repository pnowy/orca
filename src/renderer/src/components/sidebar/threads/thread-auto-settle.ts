import type { AgentStatusEntry } from '../../../../../shared/agent-status-types'
import { resolveAgentStatusWorktreeId } from '../../../../../shared/agent-status-worktree-attribution'

/** Workspaces with an agent pane in any state, done included; stopping the agent removes its entry. */
export function getWorktreeIdsWithAgentPanes(
  agentStatusByPaneKey: Record<string, AgentStatusEntry> | null | undefined,
  tabsByWorktree: Record<string, readonly { id: string }[]> | null | undefined
): Set<string> {
  const worktreeIdByTabId = new Map<string, string>()
  for (const [worktreeId, tabs] of Object.entries(tabsByWorktree ?? {})) {
    for (const tab of tabs) {
      worktreeIdByTabId.set(tab.id, worktreeId)
    }
  }
  const result = new Set<string>()
  for (const entry of Object.values(agentStatusByPaneKey ?? {})) {
    const worktreeId = resolveAgentStatusWorktreeId(entry, worktreeIdByTabId)
    if (worktreeId) {
      result.add(worktreeId)
    }
  }
  return result
}

/** Workspaces whose last agent stopped between two samples. */
export function getStoppedAgentWorktreeIds(
  previous: ReadonlySet<string> | null,
  current: ReadonlySet<string>
): string[] {
  return previous ? [...previous].filter((id) => !current.has(id)) : []
}
