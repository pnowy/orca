import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FolderGit2, FolderOpen, SquareDashed } from 'lucide-react'
import { useAppStore } from '@/store'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { RepoIconGlyph } from '@/components/repo/repo-icon'
import { AgentIcon, getAgentCatalog } from '@/lib/agent-catalog'
import { translate } from '@/i18n/i18n'
import { isGitRepoKind } from '../../../../../shared/repo-kind'
import type { Repo } from '../../../../../shared/repo-types'
import type { TuiAgent } from '../../../../../shared/tui-agent'
import {
  getRepoExecutionHostId,
  LOCAL_EXECUTION_HOST_ID
} from '../../../../../shared/execution-host'
import {
  launchNoProjectThread,
  launchThreadOnCheckout,
  launchThreadOnNewWorktree
} from './thread-launch'

type Target = { kind: 'project'; repo: Repo } | { kind: 'none' }
type WorkspaceChoice = 'checkout' | 'worktree'

const NO_PROJECT_VALUE = '__no-project__'

function useOfferedAgents(): { agents: TuiAgent[]; defaultAgent: TuiAgent | null } {
  const settings = useAppStore((s) => s.settings)
  const detected = useAppStore((s) => s.detectedAgentIds)
  return useMemo(() => {
    const disabled = new Set(settings?.disabledTuiAgents ?? [])
    const detectedSet = detected ? new Set(detected) : null
    const agents = getAgentCatalog()
      .map((entry) => entry.id)
      .filter((id) => !disabled.has(id) && (!detectedSet || detectedSet.has(id)))
    const preferred = settings?.defaultTuiAgent
    const defaultAgent =
      preferred && preferred !== 'blank' && agents.includes(preferred)
        ? preferred
        : (agents[0] ?? null)
    return { agents, defaultAgent }
  }, [settings, detected])
}

function hostLabel(repo: Repo): string {
  return getRepoExecutionHostId(repo) === LOCAL_EXECUTION_HOST_ID
    ? translate('components.sidebar.threads.local', 'Local')
    : getRepoExecutionHostId(repo)
}

function ProjectPicker({
  repos,
  onPick,
  onClose
}: {
  repos: readonly Repo[]
  onPick: (target: Target) => void
  onClose: () => void
}): React.JSX.Element {
  // ⌘1–9 picks a project without leaving the search field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return
      }
      const index = Number.parseInt(event.key, 10)
      if (Number.isInteger(index) && index >= 1 && index <= 9 && repos[index - 1]) {
        event.preventDefault()
        onPick({ kind: 'project', repo: repos[index - 1] })
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [repos, onPick])

  return (
    <>
      <CommandInput
        autoFocus
        onKeyDown={(event) => {
          // Backspace on an empty search closes, like T3's palette.
          if (event.key === 'Backspace' && event.currentTarget.value === '') {
            onClose()
          }
        }}
        placeholder={translate('components.sidebar.threads.searchProjects', 'Search projects...')}
      />
      <CommandList className="max-h-[360px]">
        <CommandEmpty>
          {translate('components.sidebar.threads.noProjects', 'No matching projects.')}
        </CommandEmpty>
        <CommandGroup heading={translate('components.sidebar.threads.projects', 'Projects')}>
          <CommandItem
            value={NO_PROJECT_VALUE}
            keywords={[translate('components.sidebar.threads.noProject', 'No project')]}
            onSelect={() => onPick({ kind: 'none' })}
          >
            <SquareDashed className="size-4 text-muted-foreground" />
            <span>{translate('components.sidebar.threads.noProject', 'No project')}</span>
          </CommandItem>
          {repos.map((repo, index) => (
            <CommandItem
              key={repo.id}
              value={repo.id}
              keywords={[repo.displayName, repo.path]}
              onSelect={() => onPick({ kind: 'project', repo })}
            >
              <RepoIconGlyph
                repoIcon={repo.repoIcon}
                color={repo.badgeColor}
                className="size-4 shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{repo.displayName}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {hostLabel(repo)} · {repo.path}
                </span>
              </div>
              {index < 9 ? (
                <span className="shrink-0 text-[11px] text-muted-foreground">⌘{index + 1}</span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  )
}

function ThreadComposer({
  target,
  onBack,
  onStartWithoutProject,
  onDone
}: {
  target: Target
  onBack: () => void
  onStartWithoutProject: () => void
  onDone: () => void
}): React.JSX.Element {
  const { agents, defaultAgent } = useOfferedAgents()
  const [agent, setAgent] = useState<TuiAgent | null>(defaultAgent)
  const [prompt, setPrompt] = useState('')
  const isGit = target.kind === 'project' && isGitRepoKind(target.repo)
  const [workspace, setWorkspace] = useState<WorkspaceChoice>(isGit ? 'worktree' : 'checkout')
  const [submitting, setSubmitting] = useState(false)
  const catalog = useMemo(() => new Map(getAgentCatalog().map((e) => [e.id, e.label])), [])

  const submit = useCallback(async () => {
    if (!agent || submitting) {
      return
    }
    setSubmitting(true)
    let ok: boolean
    if (target.kind === 'none') {
      ok = await launchNoProjectThread({ agent, prompt })
    } else if (workspace === 'checkout') {
      ok = launchThreadOnCheckout({ repoId: target.repo.id, agent, prompt })
    } else {
      ok = await launchThreadOnNewWorktree({ repoId: target.repo.id, agent, prompt })
    }
    setSubmitting(false)
    if (ok) {
      onDone()
    }
  }, [agent, onDone, prompt, submitting, target, workspace])

  const title =
    target.kind === 'project'
      ? translate('components.sidebar.threads.buildIn', 'What should we build in {{name}}?', {
          name: target.repo.displayName
        })
      : translate('components.sidebar.threads.buildNoProject', 'What should we build?')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon-xs"
          className="mt-0.5"
          aria-label={translate('components.sidebar.threads.back', 'Back')}
          onClick={onBack}
        >
          <ArrowLeft className="size-3.5" />
        </Button>
        <div className="flex min-w-0 flex-col">
          <DialogTitle size="compact">{title}</DialogTitle>
          {target.kind === 'project' ? (
            <button
              type="button"
              className="self-start text-xs text-muted-foreground hover:text-foreground"
              onClick={onStartWithoutProject}
            >
              {translate(
                'components.sidebar.threads.startWithoutProject',
                'or start without a project'
              )}
            </button>
          ) : null}
        </div>
      </div>
      <Textarea
        autoFocus
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            void submit()
          }
        }}
        placeholder={translate(
          'components.sidebar.threads.promptPlaceholder',
          'Ask for changes, or leave empty to just start the agent'
        )}
        className="min-h-24 resize-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={agent ?? undefined}
          onValueChange={(value) => setAgent(agents.find((id) => id === value) ?? null)}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={translate('components.sidebar.threads.agent', 'Agent')} />
          </SelectTrigger>
          <SelectContent>
            {agents.map((id) => (
              <SelectItem key={id} value={id}>
                <AgentIcon agent={id} size={12} />
                {catalog.get(id) ?? id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {target.kind === 'project' ? (
          <Select
            value={workspace}
            onValueChange={(value) => setWorkspace(value === 'checkout' ? 'checkout' : 'worktree')}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checkout">
                <FolderOpen className="size-3.5" />
                {translate('components.sidebar.threads.currentCheckout', 'Current checkout')}
              </SelectItem>
              {isGit ? (
                <SelectItem value="worktree">
                  <FolderGit2 className="size-3.5" />
                  {translate('components.sidebar.threads.newWorktree', 'New worktree')}
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        ) : null}
        <div className="flex-1" />
        <Button size="sm" disabled={!agent || submitting} onClick={() => void submit()}>
          {translate('components.sidebar.threads.start', 'Start')}
          <span className="text-[11px] opacity-70">⌘↵</span>
        </Button>
      </div>
    </div>
  )
}

export default function NewThreadDialog(): React.JSX.Element | null {
  const visible = useAppStore((s) => s.activeModal === 'new-thread')
  const closeModal = useAppStore((s) => s.closeModal)
  const repos = useAppStore((s) => s.repos)
  const [target, setTarget] = useState<Target | null>(null)

  useEffect(() => {
    if (!visible) {
      setTarget(null)
    }
  }, [visible])

  const handlePick = useCallback((next: Target) => setTarget(next), [])

  if (!visible) {
    return null
  }

  if (target === null) {
    return (
      <CommandDialog
        open
        onOpenChange={(open) => !open && closeModal()}
        title={translate('components.sidebar.threads.newThread', 'New thread')}
        description={translate(
          'components.sidebar.threads.dialogDescription',
          'Pick a project, then describe what the agent should do.'
        )}
      >
        <ProjectPicker repos={repos} onPick={handlePick} onClose={closeModal} />
      </CommandDialog>
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeModal()}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        <DialogDescription className="sr-only">
          {translate(
            'components.sidebar.threads.dialogDescription',
            'Pick a project, then describe what the agent should do.'
          )}
        </DialogDescription>
        <ThreadComposer
          key={target.kind === 'project' ? target.repo.id : NO_PROJECT_VALUE}
          target={target}
          onBack={() => setTarget(null)}
          onStartWithoutProject={() => setTarget({ kind: 'none' })}
          onDone={closeModal}
        />
      </DialogContent>
    </Dialog>
  )
}
