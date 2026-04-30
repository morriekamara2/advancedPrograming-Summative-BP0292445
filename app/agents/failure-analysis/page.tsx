'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Sparkles, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FailureAnalysisOutputPanel } from '@/components/agents/FailureAnalysisOutput'
import { ExportMenu } from '@/components/shared/ExportMenu'
import { LoadingOverlay } from '@/components/shared/LoadingSpinner'
import type { FailureAnalysisRecord } from '@/types'

const EXAMPLE_LOG = `[14:23:45] Running: Transfer exceeds daily limit — error message validation
[14:23:46] ✓ Given I am logged in as a verified customer (1.2s)
[14:23:48] ✓ And I navigate to "Make a Payment" (1.8s)
[14:23:50] ✓ When I enter amount "£10,600.00" (0.4s)
[14:23:52] ✓ And I confirm the payment (1.4s)
[14:23:53] ✗ Then I should see an error "Daily limit exceeded" (0.3s)
  AssertionError: expect(received).toContainText(expected)
  Expected string: "Daily limit exceeded"
  Received string: "Payment cannot be processed at this time"`

const EXAMPLE_TRACE = `AssertionError: expect(received).toContainText(expected)

Expected string: "Daily limit exceeded"
Received string: "Payment cannot be processed at this time"

  at TransferPage.assertErrorMessage (src/pages/TransferPage.ts:87:5)
  at Context.<anonymous> (src/steps/transfer.steps.ts:44:3)`

export default function FailureAnalysisPage() {
  const router = useRouter()

  const [scenarioName, setScenarioName] = useState('')
  const [failedLog, setFailedLog] = useState('')
  const [stackTrace, setStackTrace] = useState('')
  const [screenshotNotes, setScreenshotNotes] = useState('')
  const [traceSummary, setTraceSummary] = useState('')
  const [environmentNotes, setEnvironmentNotes] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<FailureAnalysisRecord | null>(null)

  const loadExample = () => {
    setScenarioName('Transfer exceeds daily limit — error message validation')
    setFailedLog(EXAMPLE_LOG)
    setStackTrace(EXAMPLE_TRACE)
    setEnvironmentNotes('QA environment. Build: 2.14.3-rc1. Last green run: Build 2.14.2.')
  }

  const handleGenerate = async () => {
    if (!scenarioName.trim() || !failedLog.trim()) {
      setError('Scenario name and failed log are required.')
      return
    }
    setError(null)
    setLoading(true)
    setRecord(null)

    try {
      const res = await fetch('/api/agents/failure-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioName,
          failedLog,
          stackTrace,
          screenshotNotes,
          traceSummary,
          environmentNotes,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Generation failed')
      }

      const data = await res.json()
      setRecord(data.record)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate failure analysis')
    } finally {
      setLoading(false)
    }
  }

  const handleSendToAutomation = () => {
    if (record) {
      const notes = `Locator recommendations from Failure Analysis: ${record.id}\n\n${record.output.locatorRecommendations.map((l) => `${l.strategy}: ${l.value} — ${l.rationale}`).join('\n')}`
      sessionStorage.setItem('automation_prefill_gherkin', notes)
      router.push('/agents/automation')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100">
              <AlertTriangle className="h-5 w-5 text-rose-700" />
            </div>
            <div>
              <CardTitle>Failure Analysis Agent</CardTitle>
              <CardDescription>
                Paste a failed Playwright log and stack trace. The AI will classify the failure,
                assess flakiness, and generate a draft triage note.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600">
              AI failure analysis is a <strong>triage recommendation only</strong>. Always verify the
              root cause with the development team before filing a defect or escalating.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scenario">
              Scenario Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="scenario"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="e.g. Transfer exceeds daily limit — error message validation"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="log">
                Failed Log <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="log"
                value={failedLog}
                onChange={(e) => setFailedLog(e.target.value)}
                placeholder="Paste the Playwright test output here…"
                rows={8}
                className="font-mono text-sm resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stack">Stack Trace (optional)</Label>
              <Textarea
                id="stack"
                value={stackTrace}
                onChange={(e) => setStackTrace(e.target.value)}
                placeholder="Paste the stack trace here…"
                rows={8}
                className="font-mono text-sm resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="env">Environment Notes (optional)</Label>
              <Textarea
                id="env"
                value={environmentNotes}
                onChange={(e) => setEnvironmentNotes(e.target.value)}
                placeholder="Build version, environment, recent deployments…"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="screenshot">Screenshot Notes (optional)</Label>
              <Textarea
                id="screenshot"
                value={screenshotNotes}
                onChange={(e) => setScreenshotNotes(e.target.value)}
                placeholder="Describe what the screenshot shows…"
                rows={3}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="gap-2 bg-rose-600 hover:bg-rose-700"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Analysing…' : 'Analyse Failure'}
            </Button>
            <Button variant="outline" size="sm" onClick={loadExample} disabled={loading}>
              Load Example
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-0">
            <LoadingOverlay text="Analysing failure…" />
          </CardContent>
        </Card>
      )}

      {record && !loading && (
        <>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Failure Analysis</h2>
              <p className="text-xs text-muted-foreground">{record.title}</p>
            </div>
            <ExportMenu itemId={record.id} />
          </div>

          <FailureAnalysisOutputPanel
            record={record}
            onSendToAutomation={handleSendToAutomation}
          />
        </>
      )}
    </div>
  )
}
