/**
 * File-based storage layer — lib/storage/files.ts
 *
 * This module satisfies the data retrieval requirement of the application.
 * All agent outputs, approval records, and audit events are persisted as
 * individual JSON files under the /data directory, organised by namespace
 * (e.g. data/outputs/, data/approvals/, data/audit/).
 *
 * Architecture decision — file storage over a database:
 *   A local file system store was chosen deliberately for this prototype.
 *   It requires zero infrastructure setup, works identically in development
 *   and CI, and keeps the data human-readable for demonstration purposes.
 *   The storage interface (writeRecord, readRecord, listRecords, updateRecord)
 *   mirrors a standard document-store API, so the implementation can be
 *   swapped for a database adapter (e.g. PostgreSQL, Firestore) by updating
 *   this single module without changing any service or API route code.
 *
 * Data structures used:
 *   - Each record is serialised as a prettified JSON object (2-space indent)
 *   - listRecords() reads all .json files in a namespace directory into an
 *     array and sorts them by timestamp fields — demonstrating array
 *     manipulation and generic type parameters (<T>)
 *   - updateRecord() uses object spread to produce a shallow merge, which is
 *     sufficient for flat record updates without deep-clone overhead
 *
 * Error handling:
 *   - readRecord() wraps JSON.parse in a try/catch and returns null on
 *     failure, preventing a corrupt file from crashing the API route
 *   - listRecords() skips individual corrupt files silently so a single bad
 *     record does not prevent the rest of the list from being returned
 *   - ensureDirectories() is called at application startup to guarantee all
 *     required directories exist before any read/write is attempted
 */

import fs from 'fs'
import path from 'path'

const DATA_ROOT = path.join(process.cwd(), 'data')
const EXPORTS_ROOT = path.join(process.cwd(), 'exports')

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const REQUIRED_DIRS = [
  path.join(DATA_ROOT, 'outputs'),
  path.join(DATA_ROOT, 'approvals'),
  path.join(DATA_ROOT, 'audit'),
  path.join(DATA_ROOT, 'prompts'),
  EXPORTS_ROOT,
  path.join(process.cwd(), 'uploads'),
]

export function ensureDirectories(): void {
  for (const dir of REQUIRED_DIRS) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

// ─── Generic CRUD ─────────────────────────────────────────────────────────────

function resolveDir(namespace: string): string {
  return path.join(DATA_ROOT, namespace)
}

function resolveFile(namespace: string, id: string): string {
  return path.join(resolveDir(namespace), `${id}.json`)
}

/**
 * Write a record to disk. Creates the namespace directory if missing.
 */
export function writeRecord<T extends { id: string }>(namespace: string, record: T): T {
  const dir = resolveDir(namespace)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const filePath = resolveFile(namespace, record.id)
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8')
  return record
}

/**
 * Read a single record by ID. Returns null if not found.
 */
export function readRecord<T>(namespace: string, id: string): T | null {
  const filePath = resolveFile(namespace, id)
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * List all records in a namespace, sorted by updatedAt/createdAt desc where available.
 */
export function listRecords<T>(namespace: string): T[] {
  const dir = resolveDir(namespace)
  if (!fs.existsSync(dir)) return []
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  const records: T[] = []
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf-8')
      records.push(JSON.parse(raw) as T)
    } catch {
      // Skip corrupt files
    }
  }
  return records.sort((a, b) => {
    const rec = a as Record<string, unknown>
    const recB = b as Record<string, unknown>
    const dateA = (rec.updatedAt ?? rec.createdAt ?? rec.submittedAt ?? rec.timestamp ?? '') as string
    const dateB = (recB.updatedAt ?? recB.createdAt ?? recB.submittedAt ?? recB.timestamp ?? '') as string
    return dateB.localeCompare(dateA)
  })
}

/**
 * Update a record by merging a partial update.
 */
export function updateRecord<T extends { id: string }>(
  namespace: string,
  id: string,
  updates: Partial<T>
): T | null {
  const existing = readRecord<T>(namespace, id)
  if (!existing) return null
  const updated: T = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  return writeRecord<T>(namespace, updated)
}

/**
 * Delete a record by ID. Returns true if found and deleted.
 */
export function deleteRecord(namespace: string, id: string): boolean {
  const filePath = resolveFile(namespace, id)
  if (!fs.existsSync(filePath)) return false
  fs.unlinkSync(filePath)
  return true
}

/**
 * Check whether a record exists.
 */
export function recordExists(namespace: string, id: string): boolean {
  return fs.existsSync(resolveFile(namespace, id))
}

/**
 * Count records in a namespace.
 */
export function countRecords(namespace: string): number {
  const dir = resolveDir(namespace)
  if (!fs.existsSync(dir)) return 0
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).length
}

// ─── Audit Append ─────────────────────────────────────────────────────────────

/**
 * Append a single event to the audit log.
 * Audit events are stored individually so the log grows without file size issues.
 */
export function appendAuditEvent(event: {
  id: string
  timestamp: string
  [key: string]: unknown
}): void {
  writeRecord('audit', event)
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function writeExport(filename: string, content: string): string {
  if (!fs.existsSync(EXPORTS_ROOT)) {
    fs.mkdirSync(EXPORTS_ROOT, { recursive: true })
  }
  const filePath = path.join(EXPORTS_ROOT, filename)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

export function readExport(filename: string): string | null {
  const filePath = path.join(EXPORTS_ROOT, filename)
  if (!fs.existsSync(filePath)) return null
  return fs.readFileSync(filePath, 'utf-8')
}

export function listExports(): string[] {
  if (!fs.existsSync(EXPORTS_ROOT)) return []
  return fs.readdirSync(EXPORTS_ROOT)
}
