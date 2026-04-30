'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FlaskConical, Sparkles, Info, Link2, Lightbulb, FileText,
  CheckCircle2, Loader2, ExternalLink, Edit3, Zap, ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TestDesignOutputPanel } from '@/components/agents/TestDesignOutput'
import { ExportMenu } from '@/components/shared/ExportMenu'
import { LoadingOverlay } from '@/components/shared/LoadingSpinner'
import type { TestDesignRecord, TestDesignSelection } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type InputMode = 'user-story' | 'jira' | 'describe'

interface ConvertedStory {
  storyText: string
  acceptanceCriteria: string
  businessNotes: string
  riskNotes: string
}

interface JiraIssueResult extends ConvertedStory {
  issueKey: string
  summary: string
  type: string
  priority: string
  source: 'jira' | 'mock'
}

// ─── Example data ─────────────────────────────────────────────────────────────

const EXAMPLE_STORY =
  'As a new customer, I want to open a savings account online so that I can start saving money. I need to select an account type, provide my personal details, pass identity verification, and make an initial deposit.'

const EXAMPLE_AC = `- Customer can choose from Easy-Access, ISA, or Fixed-Rate account types
- All mandatory fields must be validated inline before submission
- Identity verification must complete before account creation
- Minimum initial deposit of £1 required
- ISA accounts are subject to the annual allowance limit (£20,000)
- Customer receives a confirmation email within 2 minutes of account creation`

const EXAMPLE_JIRA_URL = 'https://jira.example.com/browse/BANK-456'

const EXAMPLE_DESCRIPTION =
  'We need to add a feature that lets customers view and download their monthly account statements online. They should be able to filter by date range and download as PDF or CSV. The last 24 months of statements should be available.'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestDesignPage() {
  const router = useRouter()

  // ─ Input mode
  const [inputMode, setInputMode] = useState<InputMode>('user-story')

  // ─ Shared form fields (populated by any mode before generating)
  const [storyText, setStoryText] = useState('')
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('')
  const [businessNotes, setBusinessNotes] = useState('')
  const [riskNotes, setRiskNotes] = useState('')

  // ─ Jira mode
  const [jiraUrl, setJiraUrl] = useState('')
  const [jiraLoading, setJiraLoading] = useState(false)
  const [jiraError, setJiraError] = useState<string | null>(null)
  const [jiraResult, setJiraResult] = useState<JiraIssueResult | null>(null)

  // ─ Describe mode
  const [featureDesc, setFeatureDesc] = useState('')
  const [convertLoading, setConvertLoading] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)
  const [convertedPreview, setConvertedPreview] = useState<ConvertedStory | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)

  // ─ Generate / output
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<TestDesignRecord | null>(null)
  const selectionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Debounced selection auto-save ────────────────────────────────────────────

  const handleSelectionChange = useCallback(
    (selection: TestDesignSelection) => {
      if (!record) return
      if (selectionSaveTimer.current) clearTimeout(selectionSaveTimer.current)
      selectionSaveTimer.current = setTimeout(async () => {
        try {
          await fetch(`/api/history/${record.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selection }),
          })
          setRecord((prev) => (prev ? { ...prev, selection } : prev))
        } catch {
          // Non-critical
        }
      }, 600)
    },
    [record]
  )

  // ─── Mode switching ───────────────────────────────────────────────────────────

  const handleModeChange = (mode: string) => {
    setInputMode(mode as InputMode)
    setError(null)
  }

  // ─── Mode 1: Load Example ─────────────────────────────────────────────────────

  const loadExample = () => {
    setStoryText(EXAMPLE_STORY)
    setAcceptanceCriteria(EXAMPLE_AC)
    setBusinessNotes(
      'High-value acquisition journey. Drop-off above 15% on deposit step triggers alert.'
    )
    setRiskNotes(
      'ISA annual contribution limit is regulatory — must not exceed £20,000. Identity verification failure must not leave orphaned records.'
    )
  }

  // ─── Mode 2: Fetch Jira Issue ─────────────────────────────────────────────────

  const handleFetchJira = async () => {
    if (!jiraUrl.trim()) {
      setJiraError('Please enter a Jira issue URL.')
      return
    }
    setJiraError(null)
    setJiraLoading(true)
    setJiraResult(null)

    try {
      const res = await fetch('/api/jira-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jiraUrl: jiraUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch Jira issue')

      setJiraResult(data as JiraIssueResult)
      setStoryText(data.storyText ?? '')
      setAcceptanceCriteria(data.acceptanceCriteria ?? '')
      setBusinessNotes(data.businessNotes ?? '')
      setRiskNotes(data.riskNotes ?? '')
    } catch (err) {
      setJiraError(err instanceof Error ? err.message : 'Failed to fetch Jira issue')
    } finally {
      setJiraLoading(false)
    }
  }

  // ─── Mode 3: Convert Description → User Story ─────────────────────────────────

  const handleConvert = async () => {
    if (featureDesc.trim().length < 20) {
      setConvertError('Please describe the feature in a bit more detail (at least 20 characters).')
      return
    }
    setConvertError(null)
    setConvertLoading(true)
    setConvertedPreview(null)
    setShowEditForm(false)

    try {
      const res = await fetch('/api/agents/story-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: featureDesc.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Conversion failed')

      setConvertedPreview({
        storyText: data.storyText,
        acceptanceCriteria: data.acceptanceCriteria,
        businessNotes: data.businessNotes,
        riskNotes: data.riskNotes,
      })
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Failed to convert description')
    } finally {
      setConvertLoading(false)
    }
  }

  // Populate form from the preview so the user can edit before generating
  const handleEditPreview = () => {
    if (!convertedPreview) return
    setStoryText(convertedPreview.storyText)
    setAcceptanceCriteria(convertedPreview.acceptanceCriteria)
    setBusinessNotes(convertedPreview.businessNotes)
    setRiskNotes(convertedPreview.riskNotes)
    setShowEditForm(true)
  }

  // Accept the preview and immediately generate — bypasses editing
  const handleAcceptAndGenerate = () => {
    if (!convertedPreview) return
    generateWithData(
      convertedPreview.storyText,
      convertedPreview.acceptanceCriteria,
      convertedPreview.businessNotes,
      convertedPreview.riskNotes
    )
  }

  // ─── Core: Generate Test Design ───────────────────────────────────────────────

  const generateWithData = async (
    story: string,
    ac: string,
    bizNotes: string,
    riskN: string
  ) => {
    if (!story.trim() || !ac.trim()) {
      setError('User story and acceptance criteria are required.')
      return
    }
    setError(null)
    setLoading(true)
    setRecord(null)

    try {
      const res = await fetch('/api/agents/test-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyText: story,
          acceptanceCriteria: ac,
          businessNotes: bizNotes,
          riskNotes: riskN,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Generation failed')
      }

      const data = await res.json()
      setRecord(data.record)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate test design')
    } finally {
      setLoading(false)
    }
  }

  // Generate using shared form state (Mode 1 and Jira/Describe edit view)
  const handleGenerate = () =>
    generateWithData(storyText, acceptanceCriteria, businessNotes, riskNotes)

  // ─── Clear everything ─────────────────────────────────────────────────────────

  const handleClear = () => {
    setRecord(null)
    setStoryText('')
    setAcceptanceCriteria('')
    setBusinessNotes('')
    setRiskNotes('')
    setJiraResult(null)
    setJiraUrl('')
    setJiraError(null)
    setConvertedPreview(null)
    setShowEditForm(false)
    setConvertError(null)
    setFeatureDesc('')
    setError(null)
  }

  // ─── Send to Automation ───────────────────────────────────────────────────────

  const handleSendToAutomation = (gherkin: string) => {
    sessionStorage.setItem('automation_prefill_gherkin', gherkin)
    if (record) sessionStorage.setItem('automation_prefill_linkedId', record.id)
    router.push('/agents/automation')
  }

  // ─── Shared editable form fields ──────────────────────────────────────────────

  const renderFormFields = (sourceLabel?: string) => (
    <div className="space-y-4">
      {sourceLabel && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            {sourceLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Review and edit the fields below before generating.
          </span>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sf-story">
            User Story <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            id="sf-story"
            value={storyText}
            onChange={(e) => setStoryText(e.target.value)}
            placeholder="As a customer, I want to…"
            rows={5}
            className="resize-y"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-ac">
            Acceptance Criteria <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            id="sf-ac"
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            placeholder="- AC1&#10;- AC2&#10;- AC3"
            rows={5}
            className="resize-y"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-biz">Business Notes (optional)</Label>
          <Textarea
            id="sf-biz"
            value={businessNotes}
            onChange={(e) => setBusinessNotes(e.target.value)}
            placeholder="Priority, stakeholders, release context…"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sf-risk">Risk / Context Notes (optional)</Label>
          <Textarea
            id="sf-risk"
            value={riskNotes}
            onChange={(e) => setRiskNotes(e.target.value)}
            placeholder="Regulatory constraints, known risks, data sensitivity…"
            rows={3}
          />
        </div>
      </div>
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Input Panel ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
              <FlaskConical className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <CardTitle>Test Design Agent</CardTitle>
              <CardDescription>
                Provide a user story your way — structured requirements, a Jira issue, or just
                describe the feature in plain English.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Governance notice */}
          <div className="flex gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600">
              AI-generated artefacts are <strong>draft recommendations</strong>. All outputs
              require human review and approval before use in test suites.
            </p>
          </div>

          {/* ── Mode Tabs ──────────────────────────────────────────────────────── */}
          <Tabs value={inputMode} onValueChange={handleModeChange}>
            <TabsList className="h-auto p-1">
              <TabsTrigger value="user-story" className="gap-2 px-4 py-2 text-sm">
                <FileText className="h-4 w-4 shrink-0" />
                <span>User Story</span>
              </TabsTrigger>
              <TabsTrigger value="jira" className="gap-2 px-4 py-2 text-sm">
                <Link2 className="h-4 w-4 shrink-0" />
                <span>Jira Issue</span>
              </TabsTrigger>
              <TabsTrigger value="describe" className="gap-2 px-4 py-2 text-sm">
                <Lightbulb className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Describe Feature</span>
                <span className="sm:hidden">Describe</span>
              </TabsTrigger>
            </TabsList>

            {/* ════════════════════════════════════════════════════════════════
                MODE 1 — User Story (existing format)
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="user-story" className="space-y-4 mt-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="story">
                    User Story <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="story"
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    placeholder="As a customer, I want to…"
                    rows={5}
                    className="resize-y"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ac">
                    Acceptance Criteria <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="ac"
                    value={acceptanceCriteria}
                    onChange={(e) => setAcceptanceCriteria(e.target.value)}
                    placeholder="- AC1&#10;- AC2&#10;- AC3"
                    rows={5}
                    className="resize-y"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business">Business Notes (optional)</Label>
                  <Textarea
                    id="business"
                    value={businessNotes}
                    onChange={(e) => setBusinessNotes(e.target.value)}
                    placeholder="Priority, stakeholders, release context…"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="risk">Risk / Context Notes (optional)</Label>
                  <Textarea
                    id="risk"
                    value={riskNotes}
                    onChange={(e) => setRiskNotes(e.target.value)}
                    placeholder="Regulatory constraints, known risks, data sensitivity…"
                    rows={3}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
                  <p className="text-sm text-rose-700">{error}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  {loading ? 'Generating…' : 'Generate Test Design'}
                </Button>
                <Button variant="outline" size="sm" onClick={loadExample} disabled={loading}>
                  Load Example
                </Button>
                {record && (
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    Clear
                  </Button>
                )}
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════════
                MODE 2 — Jira Issue
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="jira" className="space-y-5 mt-5">
              {/* URL input section */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Fetch from Jira</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Paste a Jira issue URL and the agent will extract the story details
                    automatically. Configure{' '}
                    <code className="bg-blue-100 rounded px-1">JIRA_BASE_URL</code>,{' '}
                    <code className="bg-blue-100 rounded px-1">JIRA_EMAIL</code>, and{' '}
                    <code className="bg-blue-100 rounded px-1">JIRA_API_TOKEN</code> in{' '}
                    <code className="bg-blue-100 rounded px-1">.env.local</code> to connect to
                    your Jira instance.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={jiraUrl}
                    onChange={(e) => setJiraUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !jiraLoading) handleFetchJira()
                    }}
                    placeholder="https://yourcompany.atlassian.net/browse/PROJ-123"
                    className="bg-white"
                    disabled={jiraLoading}
                  />
                  <Button
                    onClick={handleFetchJira}
                    disabled={jiraLoading || !jiraUrl.trim()}
                    className="shrink-0 gap-2"
                  >
                    {jiraLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching…
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        Fetch Issue
                      </>
                    )}
                  </Button>
                </div>

                <button
                  onClick={() => setJiraUrl(EXAMPLE_JIRA_URL)}
                  disabled={jiraLoading}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Use example URL
                </button>
              </div>

              {/* Jira fetch error */}
              {jiraError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
                  <p className="text-sm text-rose-700">{jiraError}</p>
                </div>
              )}

              {/* Fetched issue + pre-populated form */}
              {jiraResult && (
                <div className="space-y-5">
                  {/* Issue banner */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs border-emerald-300 text-emerald-800 bg-white"
                        >
                          {jiraResult.issueKey}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {jiraResult.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {jiraResult.priority}
                        </Badge>
                        {jiraResult.source === 'mock' && (
                          <Badge
                            variant="outline"
                            className="text-xs text-amber-700 border-amber-300 bg-amber-50"
                          >
                            Demo mode
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-emerald-900 truncate">
                        {jiraResult.summary}
                      </p>
                    </div>
                  </div>

                  {/* Editable form */}
                  {renderFormFields(`Auto-populated from ${jiraResult.issueKey}`)}

                  {error && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
                      <p className="text-sm text-rose-700">{error}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      {loading ? 'Generating…' : 'Generate Test Design'}
                    </Button>
                    {record && (
                      <Button variant="ghost" size="sm" onClick={handleClear}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ════════════════════════════════════════════════════════════════
                MODE 3 — Describe Feature (no BDD knowledge needed)
            ════════════════════════════════════════════════════════════════ */}
            <TabsContent value="describe" className="space-y-5 mt-5">

              {/* ── Step 1: Description input (visible until preview is shown) */}
              {!convertedPreview && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-1">
                    <p className="text-sm font-semibold text-violet-900">
                      No user story or BDD knowledge needed
                    </p>
                    <p className="text-xs text-violet-700 leading-relaxed">
                      Just describe what the feature does in plain English. The AI will convert
                      it into a properly structured user story and acceptance criteria for you to
                      review before generating any test design.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="feature-desc">
                      Describe the Feature <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="feature-desc"
                      value={featureDesc}
                      onChange={(e) => setFeatureDesc(e.target.value)}
                      placeholder="e.g. We need to allow customers to view and download their monthly bank statements online. They should be able to filter by date range and export as PDF or CSV. Up to 24 months of history should be available…"
                      rows={7}
                      className="resize-y"
                      disabled={convertLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Don&apos;t worry about format — just explain what the feature should do.
                      The more context you include, the better the output.
                    </p>
                  </div>

                  {convertError && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
                      <p className="text-sm text-rose-700">{convertError}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleConvert}
                      disabled={convertLoading || featureDesc.trim().length < 5}
                      className="gap-2"
                    >
                      {convertLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Converting…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Convert to User Story
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFeatureDesc(EXAMPLE_DESCRIPTION)}
                      disabled={convertLoading}
                    >
                      Load Example
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Step 2: AI-converted preview (shown after conversion) */}
              {convertedPreview && !showEditForm && (
                <div className="space-y-4">
                  {/* Back link */}
                  <button
                    onClick={() => {
                      setConvertedPreview(null)
                      setShowEditForm(false)
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to description
                  </button>

                  {/* Preview card */}
                  <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-slate-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-violet-200 bg-violet-50">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-200">
                        <Sparkles className="h-4 w-4 text-violet-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-violet-900">
                          AI-Converted User Story
                        </p>
                        <p className="text-xs text-violet-600">
                          Review below — accept to generate or edit first
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="ml-auto text-xs border-violet-300 text-violet-700 bg-white"
                      >
                        Preview
                      </Badge>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                          User Story
                        </p>
                        <p className="text-sm text-slate-800 leading-relaxed">
                          {convertedPreview.storyText}
                        </p>
                      </div>

                      <Separator className="bg-violet-100" />

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                          Acceptance Criteria
                        </p>
                        <div className="space-y-1">
                          {convertedPreview.acceptanceCriteria
                            .split('\n')
                            .filter(Boolean)
                            .map((ac, i) => (
                              <p key={i} className="text-sm text-slate-700 leading-relaxed">
                                {ac}
                              </p>
                            ))}
                        </div>
                      </div>

                      {convertedPreview.businessNotes && (
                        <>
                          <Separator className="bg-violet-100" />
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                              Business Notes
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {convertedPreview.businessNotes}
                            </p>
                          </div>
                        </>
                      )}

                      {convertedPreview.riskNotes && (
                        <>
                          <Separator className="bg-violet-100" />
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                              Risk / Context Notes
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {convertedPreview.riskNotes}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleAcceptAndGenerate}
                      disabled={loading}
                      className="gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4" />
                          Accept &amp; Generate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleEditPreview}
                      disabled={loading}
                      className="gap-2"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit First
                    </Button>
                  </div>

                  {error && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
                      <p className="text-sm text-rose-700">{error}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 3: Editable form (after "Edit First") */}
              {convertedPreview && showEditForm && (
                <div className="space-y-5">
                  {/* Back to preview */}
                  <button
                    onClick={() => setShowEditForm(false)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to preview
                  </button>

                  {renderFormFields('Auto-converted from your description')}

                  {error && (
                    <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3">
                      <p className="text-sm text-rose-700">{error}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      {loading ? 'Generating…' : 'Generate Test Design'}
                    </Button>
                    {record && (
                      <Button variant="ghost" size="sm" onClick={handleClear}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Loading overlay ──────────────────────────────────────────────────── */}
      {loading && (
        <Card>
          <CardContent className="py-0">
            <LoadingOverlay text="Generating test design…" />
          </CardContent>
        </Card>
      )}

      {/* ── Output ───────────────────────────────────────────────────────────── */}
      {record && !loading && (
        <>
          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Generated Output</h2>
              <p className="text-xs text-muted-foreground">{record.title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportMenu itemId={record.id} />
            </div>
          </div>

          <TestDesignOutputPanel
            record={record}
            onSendToAutomation={handleSendToAutomation}
            onSelectionChange={handleSelectionChange}
          />
        </>
      )}
    </div>
  )
}
