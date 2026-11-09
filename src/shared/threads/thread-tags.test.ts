import { describe, expect, it } from 'vitest'
import {
  EMPTY_THREAD_TAGS,
  addThreadTag,
  deleteThreadTag,
  matchesThreadTagFilter,
  projectTagFilterId,
  pruneThreadTagFilter,
  toggleThreadTagAssignment,
  type ThreadTags
} from './thread-tags'

function tagged(): ThreadTags {
  let tags = addThreadTag(EMPTY_THREAD_TAGS, { id: 'work', name: 'work', color: '#ef4444' }).tags
  tags = addThreadTag(tags, { id: 'exp', name: 'experiments', color: '#22c55e' }).tags
  tags = toggleThreadTagAssignment(tags, 'byProject', 'repo-a', 'work')
  return toggleThreadTagAssignment(tags, 'byThread', 'thread-b1', 'exp')
}

describe('matchesThreadTagFilter', () => {
  it('matches any selected tag, including tags inherited from the project', () => {
    const tags = tagged()
    const filter = ['work', 'exp']
    expect(matchesThreadTagFilter(filter, tags, 'thread-a1', 'repo-a')).toBe(true)
    expect(matchesThreadTagFilter(filter, tags, 'thread-b1', 'repo-b')).toBe(true)
    expect(matchesThreadTagFilter(filter, tags, 'thread-b2', 'repo-b')).toBe(false)
  })

  it('matches every thread of a selected project tag', () => {
    expect(
      matchesThreadTagFilter([projectTagFilterId('repo-b')], tagged(), 'thread-b2', 'repo-b')
    ).toBe(true)
  })
})

describe('deleteThreadTag', () => {
  it('removes the tag from every assignment and from the filter', () => {
    const tags = deleteThreadTag(tagged(), 'work')
    expect(tags.byProject).toEqual({})
    expect(pruneThreadTagFilter(['work', 'exp', projectTagFilterId('repo-a')], tags)).toEqual([
      'exp',
      projectTagFilterId('repo-a')
    ])
  })
})

describe('addThreadTag', () => {
  it('reuses an existing tag whose name differs only by case', () => {
    const result = addThreadTag(tagged(), { id: 'new', name: ' Work ', color: '#8b5cf6' })
    expect(result.tag.id).toBe('work')
    expect(result.tags.tags).toHaveLength(2)
  })
})
