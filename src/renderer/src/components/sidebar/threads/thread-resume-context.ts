import { createContext, useContext } from 'react'
import type { Worktree } from '../../../../../shared/worktree/types'

/** Resumes a reopened thread's latest past session; absent outside the Threads list. */
export const ThreadResumeContext = createContext<((worktree: Worktree) => void) | null>(null)

export function useThreadResume(): ((worktree: Worktree) => void) | null {
  return useContext(ThreadResumeContext)
}
