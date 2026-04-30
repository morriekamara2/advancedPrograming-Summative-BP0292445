import { writeRecord, listRecords } from '@/lib/storage'
import { generateId, now } from '@/lib/utils'
import type { AuditEvent, AuditEventType, AgentType } from '@/types'

export function logAuditEvent(params: {
  eventType: AuditEventType
  itemId: string
  itemTitle: string
  agentType: AgentType
  actor: string
  details: string
  metadata?: Record<string, unknown>
}): AuditEvent {
  const event: AuditEvent = {
    id: generateId('aud'),
    timestamp: now(),
    ...params,
  }
  writeRecord<AuditEvent>('audit', event)
  return event
}

export function getAuditLog(limit = 100): AuditEvent[] {
  return listRecords<AuditEvent>('audit').slice(0, limit)
}

export function getAuditLogForItem(itemId: string): AuditEvent[] {
  return listRecords<AuditEvent>('audit').filter((e) => e.itemId === itemId)
}
