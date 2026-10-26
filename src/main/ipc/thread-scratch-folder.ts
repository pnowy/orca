import { randomBytes } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ipcMain } from 'electron'

import type { Store } from '../persistence'
import { getDefaultWorkspaceDir } from '../../shared/constants'

const THREAD_SCRATCH_ROOT_NAME = 'threads'

function localDateStamp(now: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** `<workspace dir>/threads/<date>-<id>`, next to Orca's worktrees, because agents write real files there. */
export async function createThreadScratchFolder(
  workspaceDir: string,
  now = new Date()
): Promise<string> {
  const folder = join(
    workspaceDir.trim() || getDefaultWorkspaceDir(homedir()),
    THREAD_SCRATCH_ROOT_NAME,
    `${localDateStamp(now)}-${randomBytes(3).toString('hex')}`
  )
  await mkdir(folder, { recursive: true })
  return folder
}

export function registerThreadScratchFolderHandler(store: Pick<Store, 'getSettings'>): void {
  ipcMain.handle('ui:createThreadScratchFolder', () =>
    createThreadScratchFolder(store.getSettings().workspaceDir)
  )
}
