import { describe, expect, it } from 'vitest'
import {
  isThreadOpen,
  isThreadSnoozed,
  nextSnoozeExpiry,
  normalizeThreadStates,
  orderThreadKeys,
  patchThreadStates,
  reorderThread,
  snoozeUntil,
  topThreadOrder
} from './thread-state'

describe('thread open state', () => {
  it('reopens only when opened after the last settle', () => {
    expect(isThreadOpen({ openedAt: 10, settledAt: 20 })).toBe(false)
    expect(isThreadOpen({ openedAt: 30, settledAt: 20 })).toBe(true)
    expect(isThreadOpen(undefined)).toBe(false)
  })

  it('uses the fallback only when the thread was never stamped', () => {
    expect(isThreadOpen(undefined, 5)).toBe(true)
    expect(isThreadOpen({ settledAt: 6 }, 5)).toBe(false)
  })
})

describe('snooze', () => {
  it('hides until the time unless the agent needs input', () => {
    expect(isThreadSnoozed({ snoozedUntil: 100 }, 50, false)).toBe(true)
    expect(isThreadSnoozed({ snoozedUntil: 100 }, 150, false)).toBe(false)
    expect(isThreadSnoozed({ snoozedUntil: 100 }, 50, true)).toBe(false)
  })

  it('finds the earliest pending expiry', () => {
    expect(
      nextSnoozeExpiry({ a: { snoozedUntil: 300 }, b: { snoozedUntil: 200 }, c: {} }, 100)
    ).toBe(200)
    expect(nextSnoozeExpiry({ a: { snoozedUntil: 50 } }, 100)).toBeNull()
  })

  it('snoozes to 9:00 tomorrow and next Monday', () => {
    // Wednesday 2026-10-28 15:30 local.
    const now = new Date(2026, 9, 28, 15, 30)
    expect(snoozeUntil('hour', now)).toBe(now.getTime() + 3_600_000)
    expect(new Date(snoozeUntil('tomorrow', now))).toEqual(new Date(2026, 9, 29, 9, 0))
    expect(new Date(snoozeUntil('next-week', now))).toEqual(new Date(2026, 10, 2, 9, 0))
    const monday = new Date(2026, 10, 2, 8, 0)
    expect(new Date(snoozeUntil('next-week', monday))).toEqual(new Date(2026, 10, 9, 9, 0))
  })
})

describe('ordering', () => {
  it('puts pinned first, then rank, then newest', () => {
    const states = { a: { order: 1 }, b: { order: 3 }, c: { openedAt: 9 }, d: { openedAt: 10 } }
    expect(orderThreadKeys(['a', 'b', 'c', 'd'], states, (key) => key === 'a')).toEqual([
      'a',
      'b',
      'd',
      'c'
    ])
  })

  it('re-ranks a moved thread into its new position', () => {
    const keys = ['a', 'b', 'c']
    const next = reorderThread({}, keys, 'c', 0)
    expect(orderThreadKeys(keys, next, () => false)).toEqual(['c', 'a', 'b'])
    expect(topThreadOrder(next)).toBe(4)
  })
})

describe('persistence', () => {
  it('drops malformed records', () => {
    expect(
      normalizeThreadStates({ a: { openedAt: 1, order: Number.NaN }, b: 'x', c: { foo: 1 } })
    ).toEqual({ a: { openedAt: 1 } })
    expect(normalizeThreadStates(null)).toEqual({})
  })

  it('deletes fields patched to undefined and removes emptied records', () => {
    const states = { a: { openedAt: 1, snoozedUntil: 2 } }
    expect(patchThreadStates(states, 'a', { snoozedUntil: undefined })).toEqual({
      a: { openedAt: 1 }
    })
    expect(patchThreadStates({ a: { order: 1 } }, 'a', { order: undefined })).toEqual({})
  })
})
