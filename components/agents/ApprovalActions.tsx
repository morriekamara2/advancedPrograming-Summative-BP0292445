'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, RotateCcw, Send, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { ItemStatus } from '@/types'

interface ApprovalActionsProps {
  itemId: string
  currentStatus: ItemStatus
  onStatusChange?: (newStatus: ItemStatus) => void
}

export function ApprovalActions({ itemId, currentStatus, onStatusChange }: ApprovalActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [showComment, setShowComment] = useState(false)

  const doAction = async (action: 'submit' | 'approve' | 'reject' | 'return') => {
    setLoading(action)
    try {
      const res = await fetch(`/api/approvals/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment: comment || undefined }),
      })
      if (!res.ok) throw new Error('Action failed')
      const data = await res.json()

      const statusMap: Record<string, ItemStatus> = {
        submit: 'pending-approval',
        approve: 'approved',
        reject: 'rejected',
        return: 'returned',
      }
      onStatusChange?.(statusMap[action])
      setComment('')
      setShowComment(false)
    } catch (err) {
      console.error('Approval action error:', err)
    } finally {
      setLoading(null)
    }
  }

  const isLoading = loading !== null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <StatusBadge status={currentStatus} />
      </div>

      {showComment && (
        <div className="space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment (optional)…"
            className="text-sm"
            rows={2}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {currentStatus === 'draft' || currentStatus === 'returned' ? (
          <Button
            size="sm"
            onClick={() => doAction('submit')}
            disabled={isLoading}
            className="gap-1.5"
          >
            {loading === 'submit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit for Approval
          </Button>
        ) : null}

        {currentStatus === 'pending-approval' ? (
          <>
            <Button
              size="sm"
              variant="success"
              onClick={() => doAction('approve')}
              disabled={isLoading}
            >
              {loading === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => doAction('reject')}
              disabled={isLoading}
            >
              {loading === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Reject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => doAction('return')}
              disabled={isLoading}
            >
              {loading === 'return' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Return for Edits
            </Button>
          </>
        ) : null}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowComment(!showComment)}
          disabled={isLoading}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {showComment ? 'Hide Comment' : 'Add Comment'}
        </Button>
      </div>

      {(currentStatus === 'approved' || currentStatus === 'rejected') && (
        <p className="text-xs text-muted-foreground italic">
          This artefact has been {currentStatus}. No further approval actions available.
        </p>
      )}
    </div>
  )
}
