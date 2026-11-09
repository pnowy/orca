import { useAppStore } from '@/store'
import { createNonSecureContextUuid } from '../../../../../shared/non-secure-context-uuid'
import {
  THREAD_TAG_COLORS,
  addThreadTag,
  deleteThreadTag,
  toggleThreadTagAssignment,
  updateThreadTag,
  type ThreadTagScope
} from '../../../../../shared/threads/thread-tags'

/** Next palette color not yet used, so fresh tags are distinguishable without picking. */
export function nextThreadTagColor(): string {
  const used = new Set(useAppStore.getState().threadTags.tags.map((tag) => tag.color))
  return (
    THREAD_TAG_COLORS.find((color) => color !== THREAD_TAG_COLORS[0] && !used.has(color)) ??
    THREAD_TAG_COLORS[useAppStore.getState().threadTags.tags.length % THREAD_TAG_COLORS.length]
  )
}

export function createThreadTag(
  name: string,
  color: string,
  assign?: { scope: ThreadTagScope; key: string }
): void {
  const { threadTags, setThreadTags } = useAppStore.getState()
  const added = addThreadTag(threadTags, { id: `tag-${createNonSecureContextUuid()}`, name, color })
  const alreadyAssigned = assign
    ? (added.tags[assign.scope][assign.key] ?? []).includes(added.tag.id)
    : true
  setThreadTags(
    assign && !alreadyAssigned
      ? toggleThreadTagAssignment(added.tags, assign.scope, assign.key, added.tag.id)
      : added.tags
  )
}

export function editThreadTag(id: string, patch: { name?: string; color?: string }): void {
  const { threadTags, setThreadTags } = useAppStore.getState()
  setThreadTags(updateThreadTag(threadTags, id, patch))
}

export function removeThreadTag(id: string): void {
  const { threadTags, setThreadTags } = useAppStore.getState()
  setThreadTags(deleteThreadTag(threadTags, id))
}

export function toggleThreadTag(scope: ThreadTagScope, key: string, id: string): void {
  const { threadTags, setThreadTags } = useAppStore.getState()
  setThreadTags(toggleThreadTagAssignment(threadTags, scope, key, id))
}

export function toggleThreadTagFilter(filterId: string): void {
  const { threadTagFilter, setThreadTagFilter } = useAppStore.getState()
  setThreadTagFilter(
    threadTagFilter.includes(filterId)
      ? threadTagFilter.filter((id) => id !== filterId)
      : [...threadTagFilter, filterId]
  )
}
