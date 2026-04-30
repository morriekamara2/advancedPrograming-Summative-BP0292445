'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, CheckCircle2, XCircle, ExternalLink,
  FolderOpen, ChevronDown, Ticket,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { TestScenario, GherkinScenario } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IssuePayloadItem {
  summary: string
  descriptionText: string
  gherkinSteps?: string
  priority?: 'High' | 'Medium' | 'Low'
  labels?: string[]
  itemType: 'scenario' | 'gherkin' | 'edge-case' | 'negative-case'
}

interface IssueResult {
  summary: string
  itemType: string
  success: boolean
  issueKey?: string
  issueUrl?: string
  error?: string
}

export interface JiraCreateDialogProps {
  open: boolean
  onClose: () => void
  selectedScenarios: TestScenario[]
  selectedGherkin: GherkinScenario[]
  selectedEdgeCases: string[]
  selectedNegativeCases: string[]
}

const ISSUE_TYPES = ['Task', 'Story', 'Bug', 'Epic', 'Feature', 'Request'] as const
const LS_PROJECT_KEY = 'qe-jira-project-key'
const LS_ISSUE_TYPE  = 'qe-jira-issue-type'

const itemTypeLabel: Record<string, string> = {
  scenario:       'Test Scenario',
  gherkin:        'Gherkin Scenario',
  'edge-case':    'Edge Case',
  'negative-case':'Negative Case',
}

const itemTypeBadge: Record<string, string> = {
  scenario:       'info',
  gherkin:        'success',
  'edge-case':    'warning',
  'negative-case':'rose',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JiraCreateDialog({
  open,
  onClose,
  selectedScenarios,
  selectedGherkin,
  selectedEdgeCases,
  selectedNegativeCases,
}: JiraCreateDialogProps) {
  const [projectKey, setProjectKey] = useState('')
  const [issueType, setIssueType] = useState<string>('Task')
  const [typeOpen, setTypeOpen] = useState(false)

  const [phase, setPhase] = useState<'idle' | 'creating' | 'done'>('idle')
  const [results, setResults] = useState<IssueResult[]>([])
  const [apiError, setApiError] = useState<string | null>(null)

  // Restore last-used values from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedKey  = localStorage.getItem(LS_PROJECT_KEY)
    const savedType = localStorage.getItem(LS_ISSUE_TYPE)
    if (savedKey)  setProjectKey(savedKey)
    if (savedType) setIssueType(savedType)
  }, [])

  // Reset to idle when reopened
  useEffect(() => {
    if (open) {
      setPhase('idle')
      setResults([])
      setApiError(null)
    }
  }, [open])

  // Build the payload items from selected artefacts
  const buildItems = useCallback((): IssuePayloadItem[] => {
    const items: IssuePayloadItem[] = []

    selectedScenarios.forEach((s) => {
      items.push({
        summary: `[Test] ${s.title}`,
        descriptionText: s.description,
        priority: s.priority,
        labels: s.tags,
        itemType: 'scenario',
      })
    })

    selectedGherkin.forEach((g) => {
      items.push({
        summary: `[Gherkin] ${g.title}`,
        descriptionText: `Gherkin scenario: ${g.title}`,
        gherkinSteps: g.steps,
        labels: g.tags,
        itemType: 'gherkin',
      })
    })

    selectedEdgeCases.forEach((ec) => {
      const summary = ec.length > 100 ? ec.substring(0, 97) + '…' : ec
      items.push({
        summary: `[Edge Case] ${summary}`,
        descriptionText: ec,
        itemType: 'edge-case',
      })
    })

    selectedNegativeCases.forEach((nc) => {
      const summary = nc.length > 100 ? nc.substring(0, 97) + '…' : nc
      items.push({
        summary: `[Negative] ${summary}`,
        descriptionText: nc,
        itemType: 'negative-case',
      })
    })

    return items
  }, [selectedScenarios, selectedGherkin, selectedEdgeCases, selectedNegativeCases])

  const items = buildItems()
  const totalCount = items.length

  const handleCreate = async () => {
    if (!projectKey.trim()) return
    setPhase('creating')
    setApiError(null)

    // Persist preferences
    localStorage.setItem(LS_PROJECT_KEY, projectKey.trim().toUpperCase())
    localStorage.setItem(LS_ISSUE_TYPE, issueType)

    try {
      const res = await fetch('/api/jira-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectKey: projectKey.trim().toUpperCase(),
          issueType,
          items,
        }),
      })
      const data = await res.json() as { results?: IssueResult[]; error?: string }

      if (!res.ok) {
        setApiError(data.error ?? 'Failed to create issues')
        setPhase('idle')
        return
      }

      setResults(data.results ?? [])
      setPhase('done')
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Network error')
      setPhase('idle')
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failCount    = results.filter((r) => !r.success).length

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 shrink-0">
              <Ticket className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>Create Jira Issues</DialogTitle>
              <DialogDescription>
                {phase === 'done'
                  ? `${successCount} of ${totalCount} issue${totalCount !== 1 ? 's' : ''} created`
                  : `${totalCount} item${totalCount !== 1 ? 's' : ''} selected — configure and create`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">

          {/* ── Phase: idle / creating — config form ── */}
          {phase !== 'done' && (
            <>
              {/* Config row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="jira-project-key" className="text-xs font-semibold">
                    Project Key <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="jira-project-key"
                      value={projectKey}
                      onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                      placeholder="e.g. BANK"
                      className="pl-8 uppercase font-mono text-sm"
                      disabled={phase === 'creating'}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Issue Type</Label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setTypeOpen((v) => !v)}
                      disabled={phase === 'creating'}
                      className={cn(
                        'flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm transition-colors',
                        'hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
                      )}
                    >
                      <span>{issueType}</span>
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', typeOpen && 'rotate-180')} />
                    </button>
                    {typeOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
                        {ISSUE_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={cn(
                              'flex w-full items-center px-3 py-2 text-sm hover:bg-accent transition-colors',
                              issueType === t && 'bg-accent font-medium'
                            )}
                            onClick={() => { setIssueType(t); setTypeOpen(false) }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Preview list */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Issues to create ({totalCount})
                </p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-muted/40 border border-border"
                    >
                      {phase === 'creating' ? (
                        <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0 mt-0.5" />
                      ) : (
                        <Ticket className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.summary}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant={itemTypeBadge[item.itemType] as never} className="text-[10px] py-0">
                            {itemTypeLabel[item.itemType]}
                          </Badge>
                          {item.priority && (
                            <span className="text-[10px] text-muted-foreground">{item.priority}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {apiError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700 dark:text-rose-400">{apiError}</p>
                </div>
              )}
            </>
          )}

          {/* ── Phase: done — results ── */}
          {phase === 'done' && (
            <div className="space-y-3">
              {/* Summary banner */}
              <div className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                failCount === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
              )}>
                {failCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-amber-500 shrink-0" />
                )}
                <div>
                  <p className={cn(
                    'text-sm font-semibold',
                    failCount === 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
                  )}>
                    {failCount === 0
                      ? `All ${successCount} issue${successCount !== 1 ? 's' : ''} created successfully`
                      : `${successCount} created · ${failCount} failed`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Project: <span className="font-mono font-semibold">{projectKey}</span> · Type: {issueType}
                  </p>
                </div>
              </div>

              {/* Per-issue results */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-2.5 px-3 py-2.5 rounded-lg border',
                      r.success
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                    )}
                  >
                    {r.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.success && r.issueKey && (
                          <span className="text-xs font-mono font-bold text-foreground">
                            {r.issueKey}
                          </span>
                        )}
                        <p className="text-xs text-muted-foreground truncate flex-1">{r.summary}</p>
                      </div>
                      {r.success && r.issueUrl && (
                        <a
                          href={r.issueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View in Jira
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                      {!r.success && r.error && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{r.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer buttons ── */}
        <div className="shrink-0 flex justify-end gap-2 pt-3 border-t border-border">
          {phase === 'done' ? (
            <Button onClick={onClose} className="gap-2">
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={phase === 'creating'}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={phase === 'creating' || !projectKey.trim() || totalCount === 0}
                className="gap-2 min-w-32"
              >
                {phase === 'creating' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                ) : (
                  <><Ticket className="h-4 w-4" /> Create {totalCount} Issue{totalCount !== 1 ? 's' : ''}</>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
