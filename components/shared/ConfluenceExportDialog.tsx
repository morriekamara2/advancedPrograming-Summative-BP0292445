'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, ExternalLink, BookOpen, FolderOpen } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { TestScenario, GherkinScenario } from '@/types'

const LS_SPACE_KEY       = 'qe-confluence-space-key'
const LS_PARENT_PAGE_ID  = 'qe-confluence-parent-page-id'

export interface ConfluenceExportDialogProps {
  open: boolean
  onClose: () => void
  storyTitle: string
  selectedScenarios: TestScenario[]
  selectedGherkin: GherkinScenario[]
  selectedEdgeCases: string[]
  selectedNegativeCases: string[]
}

type Phase = 'idle' | 'exporting' | 'done' | 'error'

export function ConfluenceExportDialog({
  open,
  onClose,
  storyTitle,
  selectedScenarios,
  selectedGherkin,
  selectedEdgeCases,
  selectedNegativeCases,
}: ConfluenceExportDialogProps) {
  const [spaceKey, setSpaceKey]         = useState('')
  const [parentPageId, setParentPageId] = useState('')
  const [pageTitle, setPageTitle]       = useState('')
  const [phase, setPhase]               = useState<Phase>('idle')
  const [pageUrl, setPageUrl]           = useState<string | null>(null)
  const [errorMsg, setErrorMsg]         = useState<string | null>(null)

  const totalItems = selectedScenarios.length + selectedGherkin.length + selectedEdgeCases.length + selectedNegativeCases.length

  // Restore last-used preferences
  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedSpace  = localStorage.getItem(LS_SPACE_KEY)
    const savedParent = localStorage.getItem(LS_PARENT_PAGE_ID)
    if (savedSpace)  setSpaceKey(savedSpace)
    if (savedParent) setParentPageId(savedParent)
  }, [])

  // Derive a default page title from the story when opened
  useEffect(() => {
    if (open) {
      setPhase('idle')
      setPageUrl(null)
      setErrorMsg(null)
      const clean = storyTitle.replace(/^\[.*?\]\s*/, '').trim()
      setPageTitle(`Test Plan: ${clean}`)
    }
  }, [open, storyTitle])

  const handleExport = async () => {
    if (!spaceKey.trim() || !pageTitle.trim()) return
    setPhase('exporting')
    setErrorMsg(null)

    localStorage.setItem(LS_SPACE_KEY, spaceKey.trim().toUpperCase())
    if (parentPageId.trim()) localStorage.setItem(LS_PARENT_PAGE_ID, parentPageId.trim())

    try {
      const res = await fetch('/api/confluence-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageTitle: pageTitle.trim(),
          spaceKey: spaceKey.trim().toUpperCase(),
          parentPageId: parentPageId.trim() || undefined,
          storyTitle,
          scenarios: selectedScenarios,
          gherkin: selectedGherkin,
          edgeCases: selectedEdgeCases,
          negativeCases: selectedNegativeCases,
        }),
      })
      const data = await res.json() as { success?: boolean; pageUrl?: string; error?: string }

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? 'Export failed')
        setPhase('error')
        return
      }

      setPageUrl(data.pageUrl ?? null)
      setPhase('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
      setPhase('error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 shrink-0">
              <BookOpen className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>Export to Confluence</DialogTitle>
              <DialogDescription>
                {phase === 'done'
                  ? 'Page created successfully'
                  : `${totalItems} item${totalItems !== 1 ? 's' : ''} will be published as a Confluence page`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {phase !== 'done' && (
            <>
              {/* Page Title */}
              <div className="space-y-1.5">
                <Label htmlFor="conf-page-title" className="text-xs font-semibold">
                  Page Title <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="conf-page-title"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="Test Plan: Payment Transfer"
                  className="text-sm"
                  disabled={phase === 'exporting'}
                />
              </div>

              {/* Space Key + Parent Page ID */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="conf-space-key" className="text-xs font-semibold">
                    Space Key <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="conf-space-key"
                      value={spaceKey}
                      onChange={(e) => setSpaceKey(e.target.value.toUpperCase())}
                      placeholder="e.g. QE"
                      className="pl-8 uppercase font-mono text-sm"
                      disabled={phase === 'exporting'}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conf-parent-id" className="text-xs font-semibold">
                    Parent Page ID <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="conf-parent-id"
                    value={parentPageId}
                    onChange={(e) => setParentPageId(e.target.value)}
                    placeholder="e.g. 123456"
                    className="font-mono text-sm"
                    disabled={phase === 'exporting'}
                  />
                </div>
              </div>

              <div className="px-3 py-2 rounded-lg bg-muted/40 border border-border">
                <p className="text-xs text-muted-foreground">
                  Will publish: <span className="font-medium text-foreground">
                    {selectedScenarios.length} scenarios · {selectedGherkin.length} Gherkin · {selectedEdgeCases.length + selectedNegativeCases.length} cases
                  </span>
                </p>
              </div>

              {(phase === 'error') && errorMsg && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <XCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700 dark:text-rose-400">{errorMsg}</p>
                </div>
              )}
            </>
          )}

          {phase === 'done' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Page created!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your test plan is now live in Confluence</p>
              </div>
              {pageUrl && (
                <a
                  href={pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
                    'bg-blue-600 text-white hover:bg-blue-700 transition-colors'
                  )}
                >
                  <BookOpen className="h-4 w-4" />
                  Open in Confluence
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-border">
          {phase === 'done' ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={phase === 'exporting'}>Cancel</Button>
              <Button
                onClick={handleExport}
                disabled={phase === 'exporting' || !spaceKey.trim() || !pageTitle.trim() || totalItems === 0}
                className="gap-2 min-w-36"
              >
                {phase === 'exporting' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</>
                ) : (
                  <><BookOpen className="h-4 w-4" /> Publish to Confluence</>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
