import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { selectWorktreesByRepo } from '@/store/workspace-record-selectors'
import { getFolderWorkspaceWorktree } from '@/store/slices/worktrees/listing/detected-worktree-meta'
import { activateAndRevealWorkspace } from '@/lib/worktree-activation'
import { launchAgentInNewTab } from '@/lib/launch-agent-in-new-tab'
import { newAgentLaunchRequestId } from '@/lib/agent-launch-request-id'
import { translate } from '@/i18n/i18n'
import type { TuiAgent } from '../../../../../shared/tui-agent'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host'
import { topThreadOrder } from '../../../../../shared/threads/thread-state'
import { getSuggestedCreatureName } from '../worktree-name-suggestions'
import {
  formatWorkspaceCreateError,
  getWorkspaceCreateErrorToastMessage
} from '@/lib/workspace-create-error-format'

/** Fixed English name: it identifies Orca's own group, so it must not change with the locale. */
export const NO_PROJECT_GROUP_NAME = 'No project'

export function findMainWorktree(repoId: string): Worktree | undefined {
  const worktrees = selectWorktreesByRepo(useAppStore.getState())[repoId] ?? []
  return worktrees.find((worktree) => worktree.isMainWorktree) ?? worktrees[0]
}

function openThread(worktree: Worktree): void {
  const { threadStates, updateThreadState } = useAppStore.getState()
  updateThreadState(getWorktreeHostIdentity(worktree), {
    openedAt: Date.now(),
    order: topThreadOrder(threadStates),
    snoozedUntil: undefined
  })
}

function startAgent(worktreeId: string, agent: TuiAgent, prompt: string): void {
  const trimmed = prompt.trim()
  const result = launchAgentInNewTab({
    requestId: newAgentLaunchRequestId(),
    agent,
    worktreeId,
    launchSource: 'sidebar',
    ...(trimmed ? { prompt: trimmed, promptDelivery: 'submit-after-ready' as const } : {})
  })
  if (!result) {
    toast.error(translate('components.sidebar.threads.launchFailed', 'Could not start the agent.'))
  }
}

/** Current checkout: one thread per project, so a second launch joins the open main thread. */
export function launchThreadOnCheckout(args: {
  repoId: string
  agent: TuiAgent
  prompt: string
}): boolean {
  const worktree = findMainWorktree(args.repoId)
  if (!worktree) {
    toast.error(
      translate('components.sidebar.threads.noCheckout', 'This project has no checkout yet.')
    )
    return false
  }
  openThread(worktree)
  activateAndRevealWorkspace(worktree.id, {
    providesInitialSurface: true,
    revealInSidebar: false,
    clearSidebarFilters: false
  })
  startAgent(worktree.id, args.agent, args.prompt)
  return true
}

export async function launchThreadOnNewWorktree(args: {
  repoId: string
  agent: TuiAgent
  prompt: string
}): Promise<boolean> {
  const state = useAppStore.getState()
  const name = getSuggestedCreatureName(selectWorktreesByRepo(state))
  try {
    const result = await state.createWorktree(
      args.repoId,
      name,
      undefined,
      'inherit',
      undefined,
      'sidebar',
      undefined,
      undefined,
      undefined,
      undefined,
      args.agent,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      // Let the first agent message name the thread, as T3 titles a thread from its prompt.
      args.prompt.trim().length > 0
    )
    openThread(result.worktree)
    activateAndRevealWorkspace(result.worktree.id, {
      providesInitialSurface: true,
      revealInSidebar: false,
      clearSidebarFilters: false,
      ...(result.setup ? { setup: result.setup } : {}),
      ...(result.defaultTabs ? { defaultTabs: result.defaultTabs } : {})
    })
    startAgent(result.worktree.id, args.agent, args.prompt)
    return true
  } catch (error) {
    toast.error(getWorkspaceCreateErrorToastMessage(formatWorkspaceCreateError(error)))
    return false
  }
}

async function ensureNoProjectGroupId(): Promise<string | null> {
  const state = useAppStore.getState()
  const existing = state.projectGroups.find(
    (group) =>
      group.name === NO_PROJECT_GROUP_NAME &&
      !group.parentPath &&
      (group.executionHostId ?? LOCAL_EXECUTION_HOST_ID) === LOCAL_EXECUTION_HOST_ID
  )
  if (existing) {
    return existing.id
  }
  const created = await state.createProjectGroup(NO_PROJECT_GROUP_NAME, LOCAL_EXECUTION_HOST_ID)
  return created?.id ?? null
}

/** A fresh scratch folder per thread, so any number of no-project threads can be open. */
export async function launchNoProjectThread(args: {
  agent: TuiAgent
  prompt: string
}): Promise<boolean> {
  const createFolder = window.api.ui.createThreadScratchFolder
  if (!createFolder) {
    toast.error(
      translate(
        'components.sidebar.threads.noProjectUnavailable',
        'Threads without a project need the desktop app.'
      )
    )
    return false
  }
  try {
    const folderPath = await createFolder()
    const groupId = await ensureNoProjectGroupId()
    if (!groupId) {
      throw new Error('Could not create the No project group.')
    }
    const folder = await useAppStore.getState().createFolderWorkspace(
      {
        projectGroupId: groupId,
        name: translate('components.sidebar.threads.untitled', 'New thread'),
        folderPath,
        createdWithAgent: args.agent,
        pendingFirstAgentMessageRename: args.prompt.trim().length > 0
      },
      { runtimeEnvironmentId: null }
    )
    if (!folder) {
      throw new Error('Could not create the thread folder workspace.')
    }
    const worktree = getFolderWorkspaceWorktree(folder)
    openThread(worktree)
    activateAndRevealWorkspace(worktree.id, {
      providesInitialSurface: true,
      revealInSidebar: false
    })
    startAgent(worktree.id, args.agent, args.prompt)
    return true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : String(error))
    return false
  }
}
