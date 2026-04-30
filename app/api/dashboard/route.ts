import { NextResponse } from 'next/server'
import { listRecords, ensureDirectories } from '@/lib/storage'
import { getAuditLog } from '@/lib/services/audit'
import type { OutputRecord, TestDesignRecord, DashboardStats, TagFrequency } from '@/types'

function topTags(allTags: string[], limit = 8): TagFrequency[] {
  const freq: Record<string, number> = {}
  allTags.forEach((t) => { freq[t] = (freq[t] ?? 0) + 1 })
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }))
}

export async function GET() {
  try {
    ensureDirectories()
    const records = listRecords<OutputRecord>('outputs')
    const tdRecords = records.filter((r): r is TestDesignRecord => r.agentType === 'test-design')

    // ── Coverage aggregates ──────────────────────────────────────────────────
    let totalScenarios = 0
    let totalGherkin = 0
    let totalEdgeCases = 0
    let totalNegativeCases = 0
    let highPriority = 0
    let mediumPriority = 0
    let lowPriority = 0
    const allRiskTags: string[] = []
    const allPriorityTags: string[] = []

    for (const r of tdRecords) {
      const out = r.output
      totalScenarios    += out.scenarios?.length ?? 0
      totalGherkin      += out.gherkinScenarios?.length ?? 0
      totalEdgeCases    += out.edgeCases?.length ?? 0
      totalNegativeCases += out.negativeCases?.length ?? 0
      out.scenarios?.forEach((s) => {
        if (s.priority === 'High')   highPriority++
        if (s.priority === 'Medium') mediumPriority++
        if (s.priority === 'Low')    lowPriority++
      })
      allRiskTags.push(...(out.riskTags ?? []))
      allPriorityTags.push(...(out.priorityTags ?? []))
    }

    const approvedCount = records.filter((r) => r.status === 'approved').length
    const reviewedCount = approvedCount + records.filter((r) => r.status === 'rejected').length
    const approvalRate = reviewedCount > 0 ? Math.round((approvedCount / reviewedCount) * 100) : 0

    const stats: DashboardStats = {
      totalRequests:    records.length,
      pendingApprovals: records.filter((r) => r.status === 'pending-approval').length,
      approved:         approvedCount,
      rejected:         records.filter((r) => r.status === 'rejected').length,
      exported:         records.filter((r) => r.status === 'exported').length,
      approvalRate,
      byAgent: {
        testDesign:      tdRecords.length,
        automation:      records.filter((r) => r.agentType === 'automation').length,
        failureAnalysis: records.filter((r) => r.agentType === 'failure-analysis').length,
        architecture:    records.filter((r) => r.agentType === 'architecture').length,
      },
      coverage: {
        totalScenarios,
        totalGherkin,
        totalEdgeCases,
        totalNegativeCases,
        highPriority,
        mediumPriority,
        lowPriority,
      },
      topRiskTags:     topTags(allRiskTags),
      topPriorityTags: topTags(allPriorityTags),
      recentActivity:  getAuditLog(10),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[dashboard] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
