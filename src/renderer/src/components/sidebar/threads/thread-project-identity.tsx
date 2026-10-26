import React from 'react'
import { SquareDashed } from 'lucide-react'
import { useAppStore } from '@/store'
import { RepoIconGlyph } from '@/components/repo/repo-icon'
import { activateWorktreeFromSidebar } from '@/lib/sidebar-worktree-activation'
import { branchName } from '@/lib/git-utils'
import { translate } from '@/i18n/i18n'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host'
import { projectGroupIdFromRepoId } from '../../../../../shared/folder-workspace-worktree'
import { resolveRepoHeaderColor } from '../project-header-color'
import { NO_PROJECT_GROUP_NAME } from './thread-launch'

/** Repo name, or the folder workspace's project group name ("No project" for scratch threads). */
export function useThreadProjectName(worktree: Worktree, repo: Repo | undefined): string {
  const groupId = repo ? null : projectGroupIdFromRepoId(worktree.repoId)
  const groupName = useAppStore((s) =>
    groupId ? (s.projectGroups ?? []).find((group) => group.id === groupId)?.name : undefined
  )
  if (repo) {
    return repo.displayName
  }
  return groupName === NO_PROJECT_GROUP_NAME
    ? translate('components.sidebar.threads.noProject', 'No project')
    : (groupName ?? '')
}

export function threadBranchLabel(worktree: Worktree): string {
  return worktree.branch ? branchName(worktree.branch) : ''
}

export function threadTitle(worktree: Worktree): string {
  return (
    worktree.displayName.trim() ||
    threadBranchLabel(worktree) ||
    worktree.path.split(/[\\/]/).pop() ||
    worktree.id
  )
}

export function activateThread(worktree: Worktree, repo: Repo | undefined): void {
  void activateWorktreeFromSidebar(
    worktree.id,
    worktree.hostId ?? (repo ? getRepoExecutionHostId(repo) : undefined)
  )
}

export function ThreadProjectGlyph({ repo }: { repo: Repo | undefined }): React.JSX.Element {
  return (
    <span className="inline-flex size-3.5 shrink-0 items-center justify-center">
      {repo ? (
        <RepoIconGlyph
          repoIcon={repo.repoIcon}
          color={resolveRepoHeaderColor(repo.badgeColor)}
          className="size-full"
          iconClassName="size-3"
        />
      ) : (
        <SquareDashed className="size-3.5" />
      )}
    </span>
  )
}
