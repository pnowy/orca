import { defineFixture } from '../../../component-fixtures/component-fixture'
import { makeWorktree } from '@/store/slices/worktrees-slice-test-fixtures'
import type { Repo } from '../../../../../shared/repo-types'
import type { AiVaultSession } from '../../../../../shared/ai-vault-types'
import type { AiVaultSearchHit } from '../../../../../shared/ai-vault-search-types'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host'
import { ThreadHistoryRow } from './ThreadHistoryRow'

const NOW = Date.now()
const repo: Repo = {
  id: 'docs',
  path: '/code/docs',
  displayName: 'docs',
  badgeColor: '#a855f7',
  addedAt: 0
}
const worktree = makeWorktree({ id: 'docs-main', repoId: 'docs', displayName: 'main' })

function session(id: string, title: string, agoMs: number): AiVaultSession {
  return {
    id,
    executionHostId: LOCAL_EXECUTION_HOST_ID,
    agent: id === 'b' ? 'codex' : 'claude',
    sessionId: id,
    title,
    cwd: '/code/docs',
    branch: 'main',
    model: null,
    filePath: `/tmp/${id}.jsonl`,
    codexHome: null,
    createdAt: null,
    updatedAt: new Date(NOW - agoMs).toISOString(),
    modifiedAt: new Date(NOW - agoMs).toISOString(),
    messageCount: 12,
    totalTokens: 0,
    previewMessages: [],
    queuedMessageCount: 0,
    subagentTranscriptCount: 0,
    resumeCommand: '',
    subagent: null
  }
}

function hit(role: 'user' | 'assistant', snippet: string): AiVaultSearchHit {
  return {
    agent: 'claude',
    sessionId: 'x',
    title: '',
    cwd: null,
    branch: null,
    updatedAt: null,
    messageCount: 0,
    score: 1,
    source: { presence: 'present' },
    evidence: { snippet, role, timestamp: null }
  }
}

const rows = [
  { session: session('a', 'Docs Updates for GitLab to GitHub', 4 * 3_600_000), worktree },
  {
    session: session('b', 'Diesel trudno zapala po postoju', 26 * 3_600_000),
    worktree,
    hit: hit('user', 'Mamy skódkę o ktawie 3 w [[dies]]lu. Dokumenty znajdziesz')
  },
  {
    session: session('c', 'Scan Images for Java and Node CVEs', 8 * 3_600_000),
    worktree,
    hit: hit('assistant', 'opment-guidelines.md: 7 links. **Pages with [[dies]] links**')
  }
]

export const list = defineFixture({
  width: 300,
  render: () => (
    <div className="flex flex-col bg-worktree-sidebar p-1.5">
      {rows.map((row) => (
        <ThreadHistoryRow key={row.session.id} row={row} repo={repo} onResume={() => {}} />
      ))}
    </div>
  )
})
