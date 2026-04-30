import { NextRequest, NextResponse } from 'next/server'
import { AutomationInputSchema } from '@/lib/schemas'
import { runAutomationAgent } from '@/lib/services/agents/automation'
import { ensureDirectories } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    ensureDirectories()
    const body = await req.json()
    const parsed = AutomationInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const actor = process.env.NEXT_PUBLIC_MOCK_USER ?? 'qe.engineer@bank.internal'
    const record = await runAutomationAgent(parsed.data, actor)

    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('[automation] Error:', error)
    return NextResponse.json({ error: 'Failed to generate automation draft' }, { status: 500 })
  }
}
