import { NextRequest, NextResponse } from 'next/server'
import { FailureAnalysisInputSchema } from '@/lib/schemas'
import { runFailureAnalysisAgent } from '@/lib/services/agents/failure-analysis'
import { ensureDirectories } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    ensureDirectories()
    const body = await req.json()
    const parsed = FailureAnalysisInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const actor = process.env.NEXT_PUBLIC_MOCK_USER ?? 'qe.engineer@bank.internal'
    const record = await runFailureAnalysisAgent(parsed.data, actor)

    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('[failure-analysis] Error:', error)
    return NextResponse.json({ error: 'Failed to generate failure analysis' }, { status: 500 })
  }
}
