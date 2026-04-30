'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardCheck, RefreshCw, Eye, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge, AgentBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { TestDesignOutputPanel } from '@/components/agents/TestDesignOutput'
import { AutomationOutputPanel } from '@/components/agents/AutomationOutput'
import { FailureAnalysisOutputPanel } from '@/components/agents/FailureAnalysisOutput'
import { timeAgo, formatDate } from '@/lib/utils'
import type { ApprovalRecord, OutputRecord, ItemStatus } from '@/types'

type FilterMode = 'pending' | 'all'

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [filter, setFilter] = useState<FilterMode>('pending')
  const [loading, setLoading] = useState(true)
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRecord | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<OutputRecord | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/approvals?filter=${filter}`)
      const data = await res.json()
      setApprovals(data.approvals ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApprovals()
  }, [filter])

  const openPreview = async (approval: ApprovalRecord) => {
    setSelectedApproval(approval)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/approvals/${approval.itemId}`)
      const data = await res.json()
      setSelectedRecord(data.record)
    } finally {
      setPreviewLoading(false)
    }
  }

  const doAction = async (itemId: string, action: 'approve' | 'reject' | 'return') => {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/approvals/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment: comment || undefined }),
      })
      if (!res.ok) throw new Error('Action failed')
      setComment('')
      setSelectedApproval(null)
      setSelectedRecord(null)
      await fetchApprovals()
    } finally {
      setActionLoading(null)
    }
  }

  const pendingCount = approvals.filter((a) => a.status === 'pending-approval').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
            <ClipboardCheck className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Approval Queue
              {pendingCount > 0 && (
                <Badge variant="warning" className="ml-2 text-xs">
                  {pendingCount} pending
                </Badge>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              Review and approve AI-generated artefacts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === 'pending' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-l ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All
            </button>
          </div>
          <Button size="icon-sm" variant="outline" onClick={fetchApprovals} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner text="Loading approvals…" />
        </div>
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={filter === 'pending' ? 'No pending approvals' : 'No approvals yet'}
          description={
            filter === 'pending'
              ? 'All caught up! Generate an artefact and submit it for approval.'
              : 'Approvals will appear here once items are submitted.'
          }
        />
      ) : (
        <div className="space-y-2">
          {approvals.map((approval, i) => (
            <motion.div
              key={approval.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="hover:border-primary/30 transition-colors">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <AgentBadge agentType={approval.agentType} />
                        <StatusBadge status={approval.status} />
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{approval.itemTitle}</p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Submitted by {approval.submittedBy}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(approval.submittedAt)}
                        </span>
                        {approval.reviewedBy && (
                          <span className="text-xs text-muted-foreground">
                            Reviewed by {approval.reviewedBy}
                          </span>
                        )}
                      </div>
                      {approval.comments.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1">
                          &quot;{approval.comments[approval.comments.length - 1].text}&quot;
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {approval.status === 'pending-approval' && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => doAction(approval.itemId, 'approve')}
                            disabled={actionLoading !== null}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => doAction(approval.itemId, 'reject')}
                            disabled={actionLoading !== null}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPreview(approval)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={!!selectedApproval}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedApproval(null)
            setSelectedRecord(null)
            setComment('')
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-8 leading-snug">
              {selectedApproval?.itemTitle}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {selectedApproval && (
                <>
                  <AgentBadge agentType={selectedApproval.agentType} />
                  <StatusBadge status={selectedApproval.status} />
                  <span className="text-xs">
                    · {timeAgo(selectedApproval.submittedAt)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner text="Loading preview…" />
            </div>
          ) : selectedRecord ? (
            <div className="space-y-4">
              {selectedRecord.agentType === 'test-design' && (
                <TestDesignOutputPanel record={selectedRecord as import('@/types').TestDesignRecord} />
              )}
              {selectedRecord.agentType === 'automation' && (
                <AutomationOutputPanel record={selectedRecord as import('@/types').AutomationRecord} />
              )}
              {selectedRecord.agentType === 'failure-analysis' && (
                <FailureAnalysisOutputPanel record={selectedRecord as import('@/types').FailureAnalysisRecord} />
              )}

              {selectedApproval?.comments.length ? (
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">REVIEW COMMENTS</p>
                  {selectedApproval.comments.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-muted/30 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{c.author}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(c.timestamp)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{c.text}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedApproval?.status === 'pending-approval' && (
                <div className="border-t pt-4 space-y-3">
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add a review comment (optional)…"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="success"
                      onClick={() => doAction(selectedApproval.itemId, 'approve')}
                      disabled={actionLoading !== null}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => doAction(selectedApproval.itemId, 'reject')}
                      disabled={actionLoading !== null}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => doAction(selectedApproval.itemId, 'return')}
                      disabled={actionLoading !== null}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Return for Edits
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
