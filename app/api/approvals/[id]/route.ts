import { NextRequest, NextResponse } from 'next/server'
import { ApprovalActionSchema } from '@/lib/schemas'
import {
  submitForApproval,
  approveItem,
  rejectItem,
  returnItem,
  getApprovalForItem,
} from '@/lib/services/approvals'
import { readRecord, ensureDirectories } from '@/lib/storage'
import type { OutputRecord } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    ensureDirectories()
    const { id } = await params
    const approval = getApprovalForItem(id)
    const record = readRecord<OutputRecord>('outputs', id)
    return NextResponse.json({ approval, record })
  } catch (error) {
    console.error('[approvals/id] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch approval' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    ensureDirectories()
    const { id } = await params
    const body = await req.json()
    const parsed = ApprovalActionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid action', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { action, comment } = parsed.data
    const actor =
      parsed.data.actor ??
      (action === 'submit'
        ? (process.env.NEXT_PUBLIC_MOCK_USER ?? 'qe.engineer@bank.internal')
        : (process.env.NEXT_PUBLIC_MOCK_APPROVER ?? 'qe.lead@bank.internal'))

    // For submit, we need the item details
    if (action === 'submit') {
      const record = readRecord<OutputRecord>('outputs', id)
      if (!record) {
        return NextResponse.json({ error: 'Record not found' }, { status: 404 })
      }
      const approval = submitForApproval(id, record.title, record.agentType, actor)
      return NextResponse.json({ success: true, approval })
    }

    let approval = null
    if (action === 'approve') approval = approveItem(id, actor, comment)
    else if (action === 'reject') approval = rejectItem(id, actor, comment)
    else if (action === 'return') approval = returnItem(id, actor, comment)

    if (!approval) {
      return NextResponse.json({ error: 'Approval record not found for this item' }, { status: 404 })
    }

    return NextResponse.json({ success: true, approval })
  } catch (error) {
    console.error('[approvals/id] POST Error:', error)
    return NextResponse.json({ error: 'Failed to process approval action' }, { status: 500 })
  }
}
