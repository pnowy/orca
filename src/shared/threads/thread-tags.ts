import { REPO_COLORS, normalizeRepoBadgeColor } from '../repo-badge-color'

export const THREAD_TAG_COLORS = REPO_COLORS

export type ThreadTag = { id: string; name: string; color: string }

/** Custom tags plus where they are applied; a project's own tag is derived from its id, never stored. */
export type ThreadTags = {
  tags: ThreadTag[]
  /** Thread host identity -> tag ids. */
  byThread: Record<string, string[]>
  /** Worktree `repoId` -> tag ids every thread of that project inherits. */
  byProject: Record<string, string[]>
}

export type ThreadTagScope = 'byThread' | 'byProject'

/** Create assigns the new tag to `assign` when given; rename edits an existing tag. */
export type ThreadTagDialogRequest =
  | { mode: 'create'; assign?: { scope: ThreadTagScope; key: string } }
  | { mode: 'rename'; tagId: string }

export const EMPTY_THREAD_TAGS: ThreadTags = { tags: [], byThread: {}, byProject: {} }

const PROJECT_FILTER_PREFIX = 'project:'
const MAX_TAG_NAME_LENGTH = 40

export function projectTagFilterId(repoId: string): string {
  return `${PROJECT_FILTER_PREFIX}${repoId}`
}

export function normalizeThreadTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_NAME_LENGTH)
}

export function findThreadTagByName(tags: ThreadTags, name: string): ThreadTag | undefined {
  const wanted = normalizeThreadTagName(name).toLowerCase()
  return tags.tags.find((tag) => tag.name.toLowerCase() === wanted)
}

/** A name that already exists (case-insensitive) reuses that tag instead of duplicating it. */
export function addThreadTag(
  tags: ThreadTags,
  draft: { id: string; name: string; color: string }
): { tags: ThreadTags; tag: ThreadTag } {
  const existing = findThreadTagByName(tags, draft.name)
  if (existing) {
    return { tags, tag: existing }
  }
  const tag: ThreadTag = {
    id: draft.id,
    name: normalizeThreadTagName(draft.name),
    color: normalizeRepoBadgeColor(draft.color) ?? THREAD_TAG_COLORS[0]
  }
  return { tags: { ...tags, tags: [...tags.tags, tag] }, tag }
}

export function updateThreadTag(
  tags: ThreadTags,
  id: string,
  patch: { name?: string; color?: string }
): ThreadTags {
  const name = patch.name === undefined ? undefined : normalizeThreadTagName(patch.name)
  const clash = name === undefined ? undefined : findThreadTagByName(tags, name)
  if (name === '' || (clash && clash.id !== id)) {
    return tags
  }
  return {
    ...tags,
    tags: tags.tags.map((tag) =>
      tag.id === id
        ? {
            ...tag,
            ...(name === undefined ? {} : { name }),
            ...(patch.color === undefined
              ? {}
              : { color: normalizeRepoBadgeColor(patch.color) ?? tag.color })
          }
        : tag
    )
  }
}

function withoutTagId(map: Record<string, string[]>, id: string): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [key, ids] of Object.entries(map)) {
    const kept = ids.filter((tagId) => tagId !== id)
    if (kept.length > 0) {
      result[key] = kept
    }
  }
  return result
}

/** Removes the tag everywhere it was applied. */
export function deleteThreadTag(tags: ThreadTags, id: string): ThreadTags {
  return {
    tags: tags.tags.filter((tag) => tag.id !== id),
    byThread: withoutTagId(tags.byThread, id),
    byProject: withoutTagId(tags.byProject, id)
  }
}

export function toggleThreadTagAssignment(
  tags: ThreadTags,
  scope: ThreadTagScope,
  key: string,
  id: string
): ThreadTags {
  const current = tags[scope][key] ?? []
  const next = current.includes(id) ? current.filter((tagId) => tagId !== id) : [...current, id]
  const map = { ...tags[scope] }
  if (next.length > 0) {
    map[key] = next
  } else {
    delete map[key]
  }
  return { ...tags, [scope]: map }
}

/** Custom tags on a thread: its own plus its project's, in catalog order. */
export function threadCustomTags(tags: ThreadTags, threadKey: string, repoId: string): ThreadTag[] {
  const ids = new Set([...(tags.byThread[threadKey] ?? []), ...(tags.byProject[repoId] ?? [])])
  return tags.tags.filter((tag) => ids.has(tag.id))
}

/** OR filter: an empty filter shows everything; otherwise any selected tag must apply. */
export function matchesThreadTagFilter(
  filter: readonly string[],
  tags: ThreadTags,
  threadKey: string,
  repoId: string
): boolean {
  if (filter.length === 0) {
    return true
  }
  const selected = new Set(filter)
  if (selected.has(projectTagFilterId(repoId))) {
    return true
  }
  return threadCustomTags(tags, threadKey, repoId).some((tag) => selected.has(tag.id))
}

/** Drops filter entries for custom tags that no longer exist; project entries are kept. */
export function pruneThreadTagFilter(filter: readonly string[], tags: ThreadTags): string[] {
  const ids = new Set(tags.tags.map((tag) => tag.id))
  return filter.filter((id) => id.startsWith(PROJECT_FILTER_PREFIX) || ids.has(id))
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item !== ''))]
    : []
}

function normalizeAssignments(raw: unknown, ids: ReadonlySet<string>): Record<string, string[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  const result: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(raw)) {
    const kept = stringArray(value).filter((id) => ids.has(id))
    if (kept.length > 0) {
      result[key] = kept
    }
  }
  return result
}

export function normalizeThreadTags(raw: unknown): ThreadTags {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return EMPTY_THREAD_TAGS
  }
  const record: Record<string, unknown> = { ...raw }
  const tags: ThreadTag[] = []
  const seenNames = new Set<string>()
  for (const item of Array.isArray(record.tags) ? record.tags : []) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const entry: Record<string, unknown> = { ...item }
    const name = typeof entry.name === 'string' ? normalizeThreadTagName(entry.name) : ''
    if (typeof entry.id !== 'string' || !entry.id || !name || seenNames.has(name.toLowerCase())) {
      continue
    }
    seenNames.add(name.toLowerCase())
    tags.push({
      id: entry.id,
      name,
      color: normalizeRepoBadgeColor(entry.color) ?? THREAD_TAG_COLORS[0]
    })
  }
  const ids = new Set(tags.map((tag) => tag.id))
  return {
    tags,
    byThread: normalizeAssignments(record.byThread, ids),
    byProject: normalizeAssignments(record.byProject, ids)
  }
}

export function normalizeThreadTagFilter(raw: unknown, tags: ThreadTags): string[] {
  return pruneThreadTagFilter(stringArray(raw), tags)
}
