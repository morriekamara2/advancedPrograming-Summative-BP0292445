/**
 * Unit tests — shared utility functions (__tests__/utils.test.ts)
 *
 * These tests cover the lib/utils/index.ts module, which provides helpers
 * used across every layer of the application: API routes, services, UI
 * components, and the storage layer.
 *
 * Because all functions in this module are pure (given the same input they
 * always return the same output, with no side effects), they are straightforward
 * to unit test without mocking. The only exception is generateId(), which uses
 * a UUID library internally — tests verify structural properties (length,
 * prefix, uniqueness) rather than an exact value.
 *
 * Test coverage rationale:
 *
 *   generateId      — IDs are used as primary keys for all persisted records.
 *                     A regression here (e.g. IDs containing dashes that
 *                     break a filename) would corrupt the storage layer.
 *
 *   formatDate/Short— Date formatting is the primary means by which the UI
 *                     displays audit timestamps. A format regression would
 *                     show garbled dates to end users.
 *
 *   truncate        — Used to display record titles in table views. Truncation
 *                     logic must preserve boundary conditions (exactly at max,
 *                     one over max, well under max).
 *
 *   slugify         — Used when generating export filenames. Incorrect
 *                     slugification could produce invalid file paths.
 *
 *   generateTitle   — Produces the title stored with every output record.
 *                     The prefix (TD:, AUTO:, FA:, ARCH:) is the primary
 *                     identifier shown in the approval queue.
 *
 *   Label/colour maps — Record<AgentType, string> maps that must cover all
 *                       four agent types. Missing an entry would cause a
 *                       runtime undefined in the UI.
 *
 * Academic requirement mapping:
 *   Data structures → Record<K,V> maps, string manipulation, typed unions
 *   Testing         → pure function unit tests with boundary and uniqueness cases
 */

import { describe, it, expect } from 'vitest'
import {
  generateId,
  now,
  formatDate,
  formatDateShort,
  truncate,
  slugify,
  generateTitle,
  AGENT_LABELS,
  AGENT_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '@/lib/utils'

// ─── generateId ───────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string')
  })

  it('returns a 12-character ID without prefix', () => {
    const id = generateId()
    expect(id).toHaveLength(12)
  })

  it('contains no dashes when no prefix is given', () => {
    expect(generateId()).not.toContain('-')
  })

  it('prepends the prefix with an underscore', () => {
    const id = generateId('td')
    expect(id.startsWith('td_')).toBe(true)
  })

  it('generates unique IDs on each call', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()))
    expect(ids.size).toBe(20)
  })
})

// ─── now ──────────────────────────────────────────────────────────────────────

describe('now', () => {
  it('returns a valid ISO 8601 string', () => {
    const result = now()
    expect(() => new Date(result)).not.toThrow()
    expect(new Date(result).toISOString()).toBe(result)
  })
})

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats an ISO date as "dd MMM yyyy, HH:mm"', () => {
    const result = formatDate('2025-06-15T09:30:00.000Z')
    // Day, abbreviated month, 4-digit year
    expect(result).toMatch(/\d{2} \w{3} \d{4}, \d{2}:\d{2}/)
  })
})

// ─── formatDateShort ──────────────────────────────────────────────────────────

describe('formatDateShort', () => {
  it('formats as "dd MMM HH:mm" (no year)', () => {
    const result = formatDateShort('2025-06-15T09:30:00.000Z')
    expect(result).toMatch(/\d{2} \w{3} \d{2}:\d{2}/)
    expect(result).not.toMatch(/\d{4}/)
  })
})

// ─── truncate ─────────────────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns the string unchanged when shorter than max', () => {
    expect(truncate('hello', 80)).toBe('hello')
  })

  it('truncates and appends ellipsis when string exceeds max', () => {
    const result = truncate('a'.repeat(100), 80)
    expect(result).toHaveLength(81) // 80 chars + ellipsis character
    expect(result.endsWith('…')).toBe(true)
  })

  it('returns unchanged string when exactly equal to max', () => {
    const str = 'a'.repeat(80)
    expect(truncate(str, 80)).toBe(str)
  })

  it('uses default max of 80', () => {
    const long = 'x'.repeat(90)
    expect(truncate(long).length).toBe(81)
  })
})

// ─── slugify ──────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world')
  })

  it('lowercases the string', () => {
    expect(slugify('UPPER CASE')).toBe('upper-case')
  })

  it('strips leading and trailing hyphens', () => {
    expect(slugify('  trimmed  ')).toBe('trimmed')
  })

  it('collapses multiple special characters into one hyphen', () => {
    expect(slugify('test---case')).toBe('test-case')
  })

  it('handles alphanumeric strings without change', () => {
    expect(slugify('abc123')).toBe('abc123')
  })
})

// ─── generateTitle ────────────────────────────────────────────────────────────

describe('generateTitle', () => {
  it('prefixes test-design titles with "TD:"', () => {
    const title = generateTitle('test-design', {
      storyText: 'As a customer I want to transfer funds',
    })
    expect(title.startsWith('TD:')).toBe(true)
  })

  it('prefixes automation titles with "AUTO:"', () => {
    const title = generateTitle('automation', {
      gherkinText: 'Scenario: Transfer funds',
    })
    expect(title.startsWith('AUTO:')).toBe(true)
  })

  it('prefixes failure-analysis titles with "FA:"', () => {
    const title = generateTitle('failure-analysis', {
      scenarioName: 'Transfer fails on timeout',
    })
    expect(title.startsWith('FA:')).toBe(true)
  })

  it('prefixes architecture titles with "ARCH:"', () => {
    const title = generateTitle('architecture', {
      question: 'Which database should the payments service use?',
    })
    expect(title.startsWith('ARCH:')).toBe(true)
  })

  it('includes a timestamp bracket at the end', () => {
    const title = generateTitle('test-design', { storyText: 'A story about something important' })
    expect(title).toMatch(/\[\d{2}\w{3}\d{4}\]/)
  })

  it('trims story snippet to 40 characters for test-design', () => {
    const longStory = 'A'.repeat(100)
    const title = generateTitle('test-design', { storyText: longStory })
    const snippet = title.replace('TD: ', '').split('…')[0]
    expect(snippet.length).toBeLessThanOrEqual(40)
  })
})

// ─── Label & Color Maps ───────────────────────────────────────────────────────

describe('AGENT_LABELS', () => {
  it('has a label for every agent type', () => {
    const agents = ['test-design', 'automation', 'failure-analysis', 'architecture'] as const
    agents.forEach((agent) => {
      expect(typeof AGENT_LABELS[agent]).toBe('string')
      expect(AGENT_LABELS[agent].length).toBeGreaterThan(0)
    })
  })
})

describe('AGENT_COLORS', () => {
  it('has a colour for every agent type', () => {
    const agents = ['test-design', 'automation', 'failure-analysis', 'architecture'] as const
    agents.forEach((agent) => {
      expect(typeof AGENT_COLORS[agent]).toBe('string')
    })
  })
})

describe('STATUS_LABELS', () => {
  it('has a label for every item status', () => {
    const statuses = [
      'draft',
      'pending-approval',
      'approved',
      'rejected',
      'returned',
      'exported',
    ] as const
    statuses.forEach((status) => {
      expect(typeof STATUS_LABELS[status]).toBe('string')
      expect(STATUS_LABELS[status].length).toBeGreaterThan(0)
    })
  })
})

describe('STATUS_COLORS', () => {
  it('has a colour for every item status', () => {
    const statuses = [
      'draft',
      'pending-approval',
      'approved',
      'rejected',
      'returned',
      'exported',
    ] as const
    statuses.forEach((status) => {
      expect(typeof STATUS_COLORS[status]).toBe('string')
    })
  })
})
