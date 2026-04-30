'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  History,
  RefreshCw,
  Eye,
  Filter,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge, AgentBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ExportMenu } from '@/components/shared/ExportMenu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TestDesignOutputPanel } from '@/components/agents/TestDesignOutput'
import { AutomationOutputPanel } from '@/components/agents/AutomationOutput'
import { FailureAnalysisOutputPanel } from '@/components/agents/FailureAnalysisOutput'
import { Badge } from '@/components/ui/badge'
import { timeAgo, formatDate } from '@/lib/utils'
import type { OutputRecord, AuditEvent } from '@/types'

export default function HistoryPage() {
  const [records, setRecords] = useState<OutputRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [agentFilter, setAgentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [selectedRecord, setSelectedRecord] = useState<OutputRecord | null>(null)
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchHistory = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (agentFilter !== 'all') params.set('agentType', agentFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    try {
      const res = await fetch(`/api/history?${params}`)
      const data = await res.json()
      setRecords(data.records ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [agentFilter, statusFilter])

  const openDetail = async (record: OutputRecord) => {
    setSelectedRecord(record)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/history/${record.id}`)
      const data = await res.json()
      setAuditLog(data.auditLog ?? [])
    } finally {
      setDetailLoading(false)
    }
  }

  const auditEventLabels: Record<string, { label: string; color: string }> = {
    created: { label: 'Created', color: 'info' },
    submitted: { label: 'Submitted', color: 'warning' },
    approved: { label: 'Approved', color: 'success' },
    rejected: { label: 'Rejected', color: 'rose' },
    returned: { label: 'Returned', color: 'warning' },
    edited: { label: 'Edited', color: 'gray' },
    exported: { label: 'Exported', color: 'purple' },
    linked: { label: 'Linked', color: 'indigo' },
    seeded: { label: 'Seeded', color: 'gray' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
            <History className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              History & Audit Trail
              <Badge variant="gray" className="ml-2 text-xs">{total} records</Badge>
            </h2>
            <p className="text-xs text-muted-foreground">
              All AI-generated artefacts and their status changes
            </p>
          </div>
        </div>
        <Button size="icon-sm" variant="outline" onClick={fetchHistory} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="All agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            <SelectItem value="test-design">Test Design</SelectItem>
            <SelectItem value="automation">Automation</SelectItem>
            <SelectItem value="failure-analysis">Failure Analysis</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending-approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="exported">Exported</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner text="Loading history…" />
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={History}
          title="No records found"
          description="Generate an artefact using one of the agent pages to see it here."
        />
      ) : (
        <div className="space-y-2">
          {records.map((record, i) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="hover:border-primary/20 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <AgentBadge agentType={record.agentType} />
                        <StatusBadge status={record.status} />
                        {record.tags.slice(0, 2).map((t) => (
                          <span key={t} className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{record.title}</p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          By {record.createdBy}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Created {timeAgo(record.createdAt)}
                        </span>
                        {record.approvedBy && (
                          <span className="text-xs text-emerald-600">
                            ✓ Approved by {record.approvedBy}
                          </span>
                        )}
                        {record.rejectedBy && (
                          <span className="text-xs text-rose-600">
                            ✗ Rejected by {record.rejectedBy}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ExportMenu itemId={record.id} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetail(record)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedRecord}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecord(null)
            setAuditLog([])
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-8 leading-snug">{selectedRecord?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {selectedRecord && (
                <>
                  <AgentBadge agentType={selectedRecord.agentType} />
                  <StatusBadge status={selectedRecord.status} />
                  <span className="text-xs">· {formatDate(selectedRecord.createdAt)}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <Tabs defaultValue="output">
              <TabsList>
                <TabsTrigger value="output">Output</TabsTrigger>
                <TabsTrigger value="audit">
                  Audit Log ({auditLog.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="output">
                {detailLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner text="Loading…" />
                  </div>
                ) : (
                  <>
                    {selectedRecord.agentType === 'test-design' && (
                      <TestDesignOutputPanel record={selectedRecord as import('@/types').TestDesignRecord} />
                    )}
                    {selectedRecord.agentType === 'automation' && (
                      <AutomationOutputPanel record={selectedRecord as import('@/types').AutomationRecord} />
                    )}
                    {selectedRecord.agentType === 'failure-analysis' && (
                      <FailureAnalysisOutputPanel record={selectedRecord as import('@/types').FailureAnalysisRecord} />
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="audit">
                <div className="space-y-2">
                  {auditLog.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No audit events found.
                    </p>
                  ) : (
                    auditLog.map((event) => {
                      const eventConfig = auditEventLabels[event.eventType] ?? { label: event.eventType, color: 'gray' }
                      return (
                        <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                          <div className="shrink-0 mt-0.5">
                            <Badge variant={eventConfig.color as never}>{eventConfig.label}</Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{event.details}</p>
                            <div className="flex gap-3 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {event.actor}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(event.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
