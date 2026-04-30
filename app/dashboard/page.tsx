'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FlaskConical,
  Code2,
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Database,
  Loader2,
  ShieldAlert,
  FileCode2,
  BarChart2,
  Target,
  Network,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AgentBadge } from '@/components/shared/StatusBadge'
import { timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) setStats(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const seedData = async () => {
    setSeeding(true)
    setSeedMessage(null)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      setSeedMessage(`Seeded ${data.seeded} records (${data.skipped} already existed)`)
      await fetchStats()
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const statCards = [
    { label: 'Total Requests',    value: stats?.totalRequests ?? 0,    icon: TrendingUp,   color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
    { label: 'Pending Approval',  value: stats?.pendingApprovals ?? 0, icon: Clock,        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40', highlight: (stats?.pendingApprovals ?? 0) > 0 },
    { label: 'Approved',          value: stats?.approved ?? 0,         icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Rejected',          value: stats?.rejected ?? 0,         icon: XCircle,      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
    { label: 'Exported',          value: stats?.exported ?? 0,         icon: Download,     color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
  ]

  const coverageCards = [
    { label: 'Test Scenarios',  value: stats?.coverage.totalScenarios ?? 0,    icon: FlaskConical, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40' },
    { label: 'Gherkin Scenarios', value: stats?.coverage.totalGherkin ?? 0,    icon: FileCode2,    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { label: 'Edge Cases',      value: stats?.coverage.totalEdgeCases ?? 0,    icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
    { label: 'Negative Cases',  value: stats?.coverage.totalNegativeCases ?? 0, icon: XCircle,     color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
  ]

  const agentCards = [
    { label: 'Test Design',    icon: FlaskConical,   count: stats?.byAgent.testDesign ?? 0,     href: '/agents/test-design',      description: 'Generate test scenarios from user stories',       gradient: 'from-blue-500 to-blue-700' },
    { label: 'Automation',     icon: Code2,          count: stats?.byAgent.automation ?? 0,     href: '/agents/automation',       description: 'Generate Playwright BDD step definitions',        gradient: 'from-indigo-500 to-indigo-700' },
    { label: 'Failure Analysis', icon: AlertTriangle, count: stats?.byAgent.failureAnalysis ?? 0, href: '/agents/failure-analysis', description: 'Triage Playwright test failures',                gradient: 'from-rose-500 to-rose-700' },
    { label: 'Architecture',   icon: Network,        count: stats?.byAgent.architecture ?? 0,   href: '/agents/architecture',     description: 'Analyse microservices and integration risks',     gradient: 'from-violet-500 to-violet-700' },
  ]

  const auditEventLabels: Record<string, string> = {
    created: 'Generated', submitted: 'Submitted for approval', approved: 'Approved',
    rejected: 'Rejected', returned: 'Returned for edits', edited: 'Edited',
    exported: 'Exported', linked: 'Linked', seeded: 'Demo data loaded',
  }

  const totalPriority = (stats?.coverage.highPriority ?? 0) + (stats?.coverage.mediumPriority ?? 0) + (stats?.coverage.lowPriority ?? 0)
  const priorityBars = [
    { label: 'High',   value: stats?.coverage.highPriority ?? 0,   color: 'bg-rose-500' },
    { label: 'Medium', value: stats?.coverage.mediumPriority ?? 0, color: 'bg-amber-400' },
    { label: 'Low',    value: stats?.coverage.lowPriority ?? 0,    color: 'bg-emerald-500' },
  ]

  return (
    <div className="space-y-8">
      {/* Seed Banner */}
      {stats?.totalRequests === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
        >
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold">Load demo data</p>
              <p className="text-xs text-blue-100">Seed realistic QE examples to see the platform in action</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/20 hover:text-white" onClick={seedData} disabled={seeding}>
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Load Demo Data
          </Button>
        </motion.div>
      )}

      {seedMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-sm text-emerald-700">✓ {seedMessage}</p>
        </div>
      )}

      {/* ── Governance Overview ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Governance Overview</h2>
          <Button size="icon-sm" variant="ghost" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={stat.highlight ? 'border-amber-300 ring-1 ring-amber-200' : ''}>
                  <CardContent className="pt-4 pb-4">
                    <div className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg mb-3', stat.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {loading ? <div className="h-7 w-12 rounded bg-muted animate-pulse" /> : stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── QE Coverage ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">QE Coverage Generated</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {coverageCards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div key={card.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg mb-3', card.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {loading ? <div className="h-7 w-12 rounded bg-muted animate-pulse" /> : card.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Priority Distribution + Risk Tags + Approval Rate ── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Priority Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-6 rounded bg-muted animate-pulse" />)}</div>
            ) : totalPriority === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No scenarios yet</p>
            ) : (
              priorityBars.map(({ label, value, color }) => {
                const pct = totalPriority > 0 ? Math.round((value / totalPriority) * 100) : 0
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground font-medium">{label}</span>
                      <span className="font-semibold text-foreground">{value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full', color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Top Risk Tags */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              Top Risk Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-6 rounded bg-muted animate-pulse" />)}</div>
            ) : (stats?.topRiskTags ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No risk tags yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(stats?.topRiskTags ?? []).map(({ tag, count }) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-400">
                    {tag}
                    <span className="ml-0.5 text-[10px] font-bold text-rose-500">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-600" />
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="h-20 rounded bg-muted animate-pulse" />
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="relative flex items-center justify-center h-24 w-24">
                  <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
                      strokeDasharray={`${stats?.approvalRate ?? 0} 100`}
                      strokeLinecap="round"
                      className="text-emerald-500 transition-all duration-700"
                    />
                  </svg>
                  <span className="absolute text-2xl font-bold text-foreground">{stats?.approvalRate ?? 0}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats?.approved ?? 0} approved · {stats?.rejected ?? 0} rejected
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Agents ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Agents</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {agentCards.map((agent, i) => {
            const Icon = agent.icon
            return (
              <motion.div key={agent.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07 }}>
                <Link href={agent.href}>
                  <Card className="group hover:border-primary/30 hover:shadow-md transition-all cursor-pointer h-full">
                    <CardContent className="pt-5 pb-5">
                      <div className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br mb-4 shadow-sm', agent.gradient)}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{agent.label}</h3>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{agent.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">{agent.count}</span>
                        <span className="text-xs text-muted-foreground">artefacts</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Approval Queue + Activity ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-amber-600" />
                Approval Queue
                {(stats?.pendingApprovals ?? 0) > 0 && (
                  <Badge variant="warning" className="text-xs">{stats?.pendingApprovals} pending</Badge>
                )}
              </CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href="/approvals">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">{[1,2].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : (stats?.pendingApprovals ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No pending approvals — all caught up!</p>
            ) : (
              <p className="text-sm text-amber-700 font-medium">
                {stats?.pendingApprovals} item{stats?.pendingApprovals !== 1 ? 's' : ''} awaiting review
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Recent Activity
              </CardTitle>
              <Button asChild size="sm" variant="ghost">
                <Link href="/history">History <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}</div>
            ) : (stats?.recentActivity ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No activity yet. Start by loading demo data.</p>
            ) : (
              <div className="space-y-2">
                {(stats?.recentActivity ?? []).slice(0, 6).map((event) => (
                  <div key={event.id} className="flex items-center gap-2">
                    <AgentBadge agentType={event.agentType} />
                    <span className="text-xs text-foreground flex-1 truncate">{auditEventLabels[event.eventType] ?? event.eventType}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(event.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
