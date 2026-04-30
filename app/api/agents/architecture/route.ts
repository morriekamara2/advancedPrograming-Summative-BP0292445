import { NextRequest, NextResponse } from 'next/server'
import { ArchitectureInputSchema } from '@/lib/schemas'
import { runArchitectureAgent } from '@/lib/services/agents/architecture'
import { ensureDirectories } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    ensureDirectories()
    const body = await req.json()
    const parsed = ArchitectureInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const actor = process.env.NEXT_PUBLIC_MOCK_USER ?? 'qe.engineer@bank.internal'
    const record = await runArchitectureAgent(parsed.data, actor)

    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('[architecture] Error:', error)
    return NextResponse.json({ error: 'Failed to run architecture analysis' }, { status: 500 })
  }
}
