// Re-export everything from the file storage layer.
// Future: swap this import for a database adapter (e.g. lib/storage/postgres.ts)
// without changing any consumer code.

export {
  ensureDirectories,
  writeRecord,
  readRecord,
  listRecords,
  updateRecord,
  deleteRecord,
  recordExists,
  countRecords,
  appendAuditEvent,
  writeExport,
  readExport,
  listExports,
} from './files'
