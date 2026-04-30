import { NextRequest, NextResponse } from 'next/server'
import { getPendingApprovals, getAllApprovals } from '@/lib/services/approvals'
import { ensureDirectories } from '@/lib/storage'

export async function GET(req: NextRequest) {
  try {
    ensureDirectories()
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') ?? 'pending'

    const approvals = filter === 'all' ? getAllApprovals() : getPendingApprovals()
    return NextResponse.json({ approvals })
  } catch (error) {
    console.error('[approvals] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 })
  }
}
