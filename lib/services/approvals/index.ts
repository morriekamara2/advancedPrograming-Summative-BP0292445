import { writeRecord, readRecord, listRecords, updateRecord } from '@/lib/storage'
import { generateId, now } from '@/lib/utils'
import { logAuditEvent } from '@/lib/services/audit'
import type { ApprovalRecord, ApprovalComment, OutputRecord, AgentType, ItemStatus } from '@/types'

const NS = 'approvals'
const OUTPUTS_NS = 'outputs'

// ─── Submit for Approval ──────────────────────────────────────────────────────

export function submitForApproval(
  itemId: string,
  itemTitle: string,
  agentType: AgentType,
  actor: string
): ApprovalRecord {
  // Update the output record status
  updateRecord<OutputRecord>(OUTPUTS_NS, itemId, {
    status: 'pending-approval',
    updatedAt: now(),
  } as Partial<OutputRecord>)

  // Create or update approval record
  const existing = listRecords<ApprovalRecord>(NS).find((r) => r.itemId === itemId)
  const record: ApprovalRecord = existing
    ? {
        ...existing,
        status: 'pending-approval',
        submittedAt: now(),
        submittedBy: actor,
        reviewedAt: undefined,
        reviewedBy: undefined,
      }
    : {
        id: generateId('apr'),
        itemId,
        itemTitle,
        agentType,
        status: 'pending-approval',
        submittedAt: now(),
        submittedBy: actor,
        comments: [],
      }

  writeRecord<ApprovalRecord>(NS, record)

  logAuditEvent({
    eventType: 'submitted',
    itemId,
    itemTitle,
    agentType,
    actor,
    details: `Submitted for approval by ${actor}`,
  })

  return record
}

// ─── Approve ──────────────────────────────────────────────────────────────────

export function approveItem(
  itemId: string,
  actor: string,
  comment?: string
): ApprovalRecord | null {
  return _reviewItem(itemId, 'approved', actor, comment)
}

// ─── Reject ───────────────────────────────────────────────────────────────────

export function rejectItem(
  itemId: string,
  actor: string,
  comment?: string
): ApprovalRecord | null {
  return _reviewItem(itemId, 'rejected', actor, comment)
}

// ─── Return for Edits ─────────────────────────────────────────────────────────

export function returnItem(
  itemId: string,
  actor: string,
  comment?: string
): ApprovalRecord | null {
  return _reviewItem(itemId, 'returned', actor, comment)
}

// ─── Internal Review Handler ──────────────────────────────────────────────────

function _reviewItem(
  itemId: string,
  newStatus: ItemStatus,
  actor: string,
  comment?: string
): ApprovalRecord | null {
  const approval = listRecords<ApprovalRecord>(NS).find((r) => r.itemId === itemId)
  if (!approval) return null

  const newComment: ApprovalComment | undefined = comment
    ? {
        id: generateId('cmt'),
        author: actor,
        text: comment,
        timestamp: now(),
      }
    : undefined

  const updated: ApprovalRecord = {
    ...approval,
    status: newStatus,
    reviewedAt: now(),
    reviewedBy: actor,
    comments: newComment ? [...approval.comments, newComment] : approval.comments,
  }

  writeRecord<ApprovalRecord>(NS, updated)

  // Propagate status to the output record
  const outputUpdates: Partial<OutputRecord> = {
    status: newStatus,
    updatedAt: now(),
  } as Partial<OutputRecord>

  if (newStatus === 'approved') {
    ;(outputUpdates as Record<string, unknown>).approvedBy = actor
    ;(outputUpdates as Record<string, unknown>).approvedAt = now()
  } else if (newStatus === 'rejected') {
    ;(outputUpdates as Record<string, unknown>).rejectedBy = actor
    ;(outputUpdates as Record<string, unknown>).rejectedAt = now()
  }

  updateRecord<OutputRecord>(OUTPUTS_NS, itemId, outputUpdates)

  logAuditEvent({
    eventType: newStatus as 'approved' | 'rejected' | 'returned',
    itemId,
    itemTitle: approval.itemTitle,
    agentType: approval.agentType,
    actor,
    details: `${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} by ${actor}${comment ? `: ${comment}` : ''}`,
    metadata: { comment },
  })

  return updated
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function getPendingApprovals(): ApprovalRecord[] {
  return listRecords<ApprovalRecord>(NS).filter((r) => r.status === 'pending-approval')
}

export function getAllApprovals(): ApprovalRecord[] {
  return listRecords<ApprovalRecord>(NS)
}

export function getApprovalForItem(itemId: string): ApprovalRecord | null {
  return listRecords<ApprovalRecord>(NS).find((r) => r.itemId === itemId) ?? null
}
