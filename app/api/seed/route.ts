import { NextResponse } from 'next/server'
import { seedDemoData } from '@/lib/services/seed'
import { ensureDirectories } from '@/lib/storage'

export async function POST() {
  try {
    ensureDirectories()
    const result = seedDemoData()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[seed] Error:', error)
    return NextResponse.json({ error: 'Failed to seed demo data' }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
