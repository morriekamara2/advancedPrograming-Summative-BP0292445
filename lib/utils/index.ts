/**
 * Shared utility functions — lib/utils/index.ts
 *
 * This module centralises helpers used across the application to avoid
 * duplication and ensure consistent behaviour. It covers four areas:
 *
 *   1. CSS class composition — merging Tailwind classes safely
 *   2. ID generation — unique identifiers for all persisted records
 *   3. Date formatting — consistent display of ISO timestamps throughout the UI
 *   4. Label and colour maps — human-readable strings and UI colour tokens
 *      for agent types and record statuses, keyed by the same discriminated
 *      union types used in the domain model (AgentType, ItemStatus)
 *
 * All functions are pure (no side effects) except `now()`, which reads the
 * system clock. This makes the date-formatting functions straightforward to
 * unit test by supplying a fixed ISO string as input.
 *
 * The generateTitle function demonstrates a switch statement over a
 * discriminated union — a common TypeScript pattern for exhaustive handling
 * of all possible AgentType values, enforced by the compiler.
 */

import { v4 as uuidv4 } from 'uuid'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import type { AgentType, ItemStatus } from '@/types'

// ─── Class Name Utility ───────────────────────────────────────────────────────
// clsx merges conditional class strings; twMerge then resolves Tailwind
// conflicts (e.g. two padding utilities on the same element). Combining both
// is the idiomatic pattern in Tailwind + shadcn-style component libraries.

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── ID Generation ────────────────────────────────────────────────────────────
// UUIDs are truncated to 12 hex characters for readability while retaining
// enough entropy for uniqueness within the application's data volume.
// An optional prefix (e.g. 'td', 'scn', 'gkn') makes log output and filenames
// self-describing without requiring a lookup table.

export function generateId(prefix?: string): string {
  const id = uuidv4().replace(/-/g, '').substring(0, 12)
  return prefix ? `${prefix}_${id}` : id
}

// ─── Date Utilities ───────────────────────────────────────────────────────────
// All timestamps are stored and passed between layers as ISO 8601 strings
// (e.g. "2025-06-15T09:30:00.000Z"). Formatting is applied only at the
// presentation layer, keeping the data layer timezone-agnostic.
// date-fns is used in preference to native Date methods for its explicit,
// locale-aware formatting API and tree-shakeable bundle footprint.

export function now(): string {
  return new Date().toISOString()
}

export function formatDate(iso: string): string {
  return format(new Date(iso), 'dd MMM yyyy, HH:mm')
}

export function formatDateShort(iso: string): string {
  return format(new Date(iso), 'dd MMM HH:mm')
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

// ─── Agent Labels ─────────────────────────────────────────────────────────────
// Record<AgentType, string> is a mapped type that enforces a value for every
// key in the AgentType union — the TypeScript compiler will error if a new
// agent type is added to the union but not to these maps. This is preferable
// to a plain object literal, which would silently allow missing keys.

export const AGENT_LABELS: Record<AgentType, string> = {
  'test-design': 'Test Design',
  automation: 'Automation',
  'failure-analysis': 'Failure Analysis',
  architecture: 'Architecture',
}

export const AGENT_COLORS: Record<AgentType, string> = {
  'test-design': 'blue',
  automation: 'indigo',
  'failure-analysis': 'rose',
  architecture: 'violet',
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  draft: 'Draft',
  'pending-approval': 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned',
  exported: 'Exported',
}

export const STATUS_COLORS: Record<ItemStatus, string> = {
  draft: 'gray',
  'pending-approval': 'amber',
  approved: 'green',
  rejected: 'red',
  returned: 'orange',
  exported: 'purple',
}

// ─── Title Generator ──────────────────────────────────────────────────────────
// Produces a human-readable title for each output record stored in the system.
// The title is derived from the agent type and the most relevant input field,
// then stamped with a short timestamp to disambiguate runs from the same day.
// The switch is exhaustive over AgentType — adding a new agent without
// updating this function will produce a TypeScript compile error.

export function generateTitle(agentType: AgentType, input: Record<string, unknown>): string {
  const timestamp = format(new Date(), 'ddMMMHHmm')
  switch (agentType) {
    case 'test-design': {
      const story = String(input.storyText ?? '')
      const snippet = story.substring(0, 40).replace(/\n/g, ' ').trim()
      return `TD: ${snippet}… [${timestamp}]`
    }
    case 'automation': {
      const gherkin = String(input.gherkinText ?? '')
      const snippet = gherkin.substring(0, 40).replace(/\n/g, ' ').trim()
      return `AUTO: ${snippet}… [${timestamp}]`
    }
    case 'failure-analysis': {
      const scenario = String(input.scenarioName ?? 'Unknown')
      return `FA: ${scenario} [${timestamp}]`
    }
    case 'architecture': {
      const question = String(input.question ?? '')
      const snippet = question.substring(0, 50).replace(/\n/g, ' ').trim()
      return `ARCH: ${snippet}… [${timestamp}]`
    }
  }
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function truncate(str: string, max = 80): string {
  return str.length > max ? str.substring(0, max) + '…' : str
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
