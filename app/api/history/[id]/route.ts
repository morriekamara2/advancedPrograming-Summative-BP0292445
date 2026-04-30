import { NextRequest, NextResponse } from 'next/server'
import { readRecord, updateRecord, ensureDirectories } from '@/lib/storage'
import { getAuditLogForItem } from '@/lib/services/audit'
import { logAuditEvent } from '@/lib/services/audit'
import { now } from '@/lib/utils'
import type { OutputRecord } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    ensureDirectories()
    const { id } = await params
    const record = readRecord<OutputRecord>('outputs', id)
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }
    const auditLog = getAuditLogForItem(id)
    return NextResponse.json({ record, auditLog })
  } catch (error) {
    console.error('[history/id] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    ensureDirectories()
    const { id } = await params
    const body = await req.json()

    const record = readRecord<OutputRecord>('outputs', id)
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    const updates: Partial<OutputRecord> = {
      updatedAt: now(),
    }

    if (body.editedOutput) {
      (updates as Record<string, unknown>).editedOutput = body.editedOutput
    }
    if (body.tags) {
      (updates as Record<string, unknown>).tags = body.tags
    }
    // Persist the user's item selections (for Test Design approval workflow)
    if (body.selection !== undefined) {
      (updates as Record<string, unknown>).selection = body.selection
    }

    const updated = updateRecord<OutputRecord>('outputs', id, updates)

    const actor = process.env.NEXT_PUBLIC_MOCK_USER ?? 'qe.engineer@bank.internal'
    // Only log a full audit event for meaningful edits, not silent selection saves
    if (body.editedOutput || body.tags) {
      logAuditEvent({
        eventType: 'edited',
        itemId: id,
        itemTitle: record.title,
        agentType: record.agentType,
        actor,
        details: `Output edited by ${actor}`,
      })
    }

    return NextResponse.json({ success: true, record: updated })
  } catch (error) {
    console.error('[history/id] PATCH Error:', error)
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
}
