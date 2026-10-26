import { randomBytes } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ipcMain } from 'electron'

const THREAD_SCRATCH_ROOT_NAME = 'orca-threads'

function localDateStamp(now: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** `<home>/orca-threads/<date>-<id>`: visible, because agents write real files there. */
export async function createThreadScratchFolder(now = new Date()): Promise<string> {
  const folder = join(
    homedir(),
    THREAD_SCRATCH_ROOT_NAME,
    `${localDateStamp(now)}-${randomBytes(3).toString('hex')}`
  )
  await mkdir(folder, { recursive: true })
  return folder
}

export function registerThreadScratchFolderHandler(): void {
  ipcMain.removeHandler('ui:createThreadScratchFolder')
  ipcMain.handle('ui:createThreadScratchFolder', () => createThreadScratchFolder())
}
