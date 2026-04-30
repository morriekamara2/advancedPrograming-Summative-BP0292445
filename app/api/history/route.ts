import { NextRequest, NextResponse } from 'next/server'
import { listRecords, ensureDirectories } from '@/lib/storage'
import type { OutputRecord } from '@/types'

export async function GET(req: NextRequest) {
  try {
    ensureDirectories()
    const { searchParams } = new URL(req.url)
    const agentType = searchParams.get('agentType')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)

    let records = listRecords<OutputRecord>('outputs')

    if (agentType) {
      records = records.filter((r) => r.agentType === agentType)
    }
    if (status) {
      records = records.filter((r) => r.status === status)
    }

    return NextResponse.json({ records: records.slice(0, limit), total: records.length })
  } catch (error) {
    console.error('[history] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
