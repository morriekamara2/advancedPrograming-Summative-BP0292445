'use client'

import { useState, useEffect } from 'react'
import { Code2, Sparkles, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AutomationOutputPanel } from '@/components/agents/AutomationOutput'
import { ExportMenu } from '@/components/shared/ExportMenu'
import { LoadingOverlay } from '@/components/shared/LoadingSpinner'
import type { AutomationRecord } from '@/types'

const EXAMPLE_GHERKIN = `@regression @smoke
Feature: Faster Payments Transfer

  Scenario: Successful payment under daily limit
    Given I am logged in as a verified customer
    And I navigate to "Make a Payment"
    When I enter sort code "20-12-34" and account number "12345678"
    And I enter amount "£500.00" and reference "Rent July"
    And I confirm the payment
    Then I should see a success message with a payment reference
    And £500.00 should be debited from my account`

export default function AutomationPage() {
  const [gherkinText, setGherkinText] = useState('')
  const [frameworkNotes, setFrameworkNotes] = useState('')
  const [existingStepsContext, setExistingStepsContext] = useState('')
  const [linkedTestDesignId, setLinkedTestDesignId] = useState<string | undefined>()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<AutomationRecord | null>(null)

  // Prefill from Test Design Agent via sessionStorage
  useEffect(() => {
    const prefillGherkin = sessionStorage.getItem('automation_prefill_gherkin')
    const prefillLinkedId = sessionStorage.getItem('automation_prefill_linkedId')
    if (prefillGherkin) {
      setGherkinText(prefillGherkin)
      sessionStorage.removeItem('automation_prefill_gherkin')
    }
    if (prefillLinkedId) {
      setLinkedTestDesignId(prefillLinkedId)
      sessionStorage.removeItem('automation_prefill_linkedId')
    }
  }, [])

  const loadExample = () => {
    setGherkinText(EXAMPLE_GHERKIN)
    setFrameworkNotes('@cucumber/cucumber v10 with Playwright world. Page objects in src/pages/. TypeScript strict mode. Strip £ and , from monetary amounts before filling inputs.')
  }

  const handleGenerate = async () => {
    if (!gherkinText.trim()) {
      setError('Gherkin text is required.')
      return
    }
    setError(null)
    setLoading(true)
    setRecord(null)

    try {
      const res = await fetch('/api/agents/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gherkinText,
          frameworkNotes,
          existingStepsContext,
          linkedTestDesignId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Generation failed')
      }

      const data = await res.json()
      setRecord(data.record)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate automation draft')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
              <Code2 className="h-5 w-5 text-indigo-700" />
            </div>
            <div>
              <CardTitle>Automation Agent</CardTitle>
              <CardDescription>
                Paste approved Gherkin scenarios. The AI will generate Playwright BDD step definitions,
                page objects, and locator recommendations.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600">
              Automation drafts require review before merging to your framework.{' '}
              <strong>Do not commit AI-generated code directly.</strong> Review locators, imports, and
              step patterns against your existing codebase.
            </p>
          </div>

          {linkedTestDesignId && (
            <div className="flex gap-2 p-2 rounded-lg bg-indigo-50 border border-indigo-200">
              <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700">
                Linked to Test Design ID: <code className="font-mono">{linkedTestDesignId}</code>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="gherkin">
              Gherkin Scenarios <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="gherkin"
              value={gherkinText}
              onChange={(e) => setGherkinText(e.target.value)}
              placeholder="Paste your Gherkin feature file here…"
              rows={10}
              className="font-mono text-sm resize-y"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="framework">Framework Conventions (optional)</Label>
              <Textarea
                id="framework"
                value={frameworkNotes}
                onChange={(e) => setFrameworkNotes(e.target.value)}
                placeholder="e.g. Cucumber v10, TypeScript, World interface pattern…"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="existing">Existing Step Context (optional)</Label>
              <Textarea
                id="existing"
                value={existingStepsContext}
                onChange={(e) => setExistingStepsContext(e.target.value)}
                placeholder="Paste relevant existing step definitions to avoid duplication…"
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={handleGenerate} disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Sparkles className="h-4 w-4" />
              {loading ? 'Generating…' : 'Generate Automation Draft'}
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
            <LoadingOverlay text="Generating automation draft…" />
          </CardContent>
        </Card>
      )}

      {record && !loading && (
        <>
          <Separator />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Generated Draft</h2>
              <p className="text-xs text-muted-foreground">{record.title}</p>
            </div>
            <ExportMenu itemId={record.id} />
          </div>

          <AutomationOutputPanel record={record} />
        </>
      )}
    </div>
  )
}
