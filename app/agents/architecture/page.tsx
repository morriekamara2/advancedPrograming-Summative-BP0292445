'use client'

import { useState } from 'react'
import {
  Network, Sparkles, Info, Boxes, ArrowDownCircle, Zap, Loader2, BookOpen, Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ArchitectureOutputPanel } from '@/components/agents/ArchitectureOutput'
import { ExportMenu } from '@/components/shared/ExportMenu'
import { LoadingOverlay } from '@/components/shared/LoadingSpinner'
import type { ArchitectureRecord } from '@/types'

// ─── Example data ─────────────────────────────────────────────────────────────

const EXAMPLE_QUESTION =
  'What are the integration risks when a customer attempts to open a Fixed-Rate ISA and the Identity Verification Service returns a delayed webhook from Onfido?'

const EXAMPLE_CONTEXT = `Our savings account opening flow is orchestrated by the Savings Account Service (SAS).
When a customer applies for a Fixed-Rate ISA, SAS calls the Identity & Verification Service (IVS) to initiate a KYC check.
IVS integrates with Onfido via REST and receives results via webhook callback.
Once IVS publishes a VerificationPassed event to the identity.verification Kafka topic, SAS transitions the account from PENDING to ACTIVE and triggers the Notification Service to send a welcome email.
The Core Banking Ledger (CBL) also consumes the AccountOpened event to register the account for regulatory reporting.`

const EXAMPLE_SERVICES = `- Savings Account Service (SAS): Java/Spring Boot, owns account lifecycle
- Identity & Verification Service (IVS): Node.js, integrates with Onfido
- Core Banking Ledger (CBL): Legacy COBOL, 15-minute batch cycle, IBM MQ integration
- Notification Service (NS): Sends email/push/SMS via AWS SES and FCM
- Kafka: Event bus — topics: identity.verification, savings.accounts`

const EXAMPLE_DOWNSTREAM = `- Onfido: Third-party KYC provider. Webhook delivery is not guaranteed.
- HMRC ISA Reporting: Annual submission. AccountOpened events must reach CBL for accurate reporting.
- FPS: Not involved in account opening but involved in initial deposit processing.`

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArchitecturePage() {
  const [question, setQuestion]                 = useState('')
  const [servicesContext, setServicesContext]   = useState('')
  const [downstreamNotes, setDownstreamNotes]   = useState('')
  const [modernisationNotes, setModernNotes]    = useState('')
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(false)

  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [record, setRecord]       = useState<ArchitectureRecord | null>(null)

  const fillExample = () => {
    setQuestion(EXAMPLE_QUESTION)
    setServicesContext(EXAMPLE_SERVICES)
    setDownstreamNotes(EXAMPLE_DOWNSTREAM)
    setModernNotes('')
  }

  const handleAnalyse = async () => {
    if (!question.trim()) return
    setLoading(true)
    setError(null)
    setRecord(null)

    try {
      const res = await fetch('/api/agents/architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          architectureContext: '',
          servicesContext: servicesContext.trim() || undefined,
          downstreamNotes: downstreamNotes.trim() || undefined,
          modernisationNotes: modernisationNotes.trim() || undefined,
          useKnowledgeBase,
        }),
      })

      const data = await res.json() as { success?: boolean; record?: ArchitectureRecord; error?: string }

      if (!res.ok || !data.success || !data.record) {
        setError(data.error ?? 'Analysis failed. Please try again.')
        return
      }

      setRecord(data.record)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const canAnalyse = question.trim().length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {loading && <LoadingOverlay text="Analysing architecture context…" />}

      {/* ── Input card ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-sm shrink-0">
                <Network className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Architecture & Integration Agent</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Structured analysis of microservices, APIs, integration risks, and testing implications
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs gap-1.5 h-8"
              onClick={fillExample}
            >
              <Zap className="h-3 w-3" />
              Load Example
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Question */}
          <div className="space-y-1.5">
            <Label htmlFor="arch-question" className="text-xs font-semibold flex items-center gap-1.5">
              Engineering Question
              <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="arch-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. What are the integration risks when the Identity Verification Service returns a delayed webhook?"
              rows={2}
              className="resize-none text-sm"
              disabled={loading}
            />
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Be specific — e.g. "What systems should a new Savings Notifications microservice communicate with?"
            </p>
          </div>

          <Separator />

          {/* Optional fields */}
          <div className="space-y-1 mb-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Optional Context</p>
            <p className="text-[11px] text-muted-foreground">Providing these significantly improves the depth and accuracy of the analysis</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Services */}
            <div className="space-y-1.5">
              <Label htmlFor="arch-services" className="text-xs font-semibold flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5 text-blue-500" />
                Services / APIs Context
              </Label>
              <Textarea
                id="arch-services"
                value={servicesContext}
                onChange={(e) => setServicesContext(e.target.value)}
                placeholder="List relevant services, their tech stack, key APIs, and responsibilities"
                rows={4}
                className="resize-none text-sm"
                disabled={loading}
              />
            </div>

            {/* Downstream */}
            <div className="space-y-1.5">
              <Label htmlFor="arch-downstream" className="text-xs font-semibold flex items-center gap-1.5">
                <ArrowDownCircle className="h-3.5 w-3.5 text-rose-500" />
                Downstream Systems Notes
              </Label>
              <Textarea
                id="arch-downstream"
                value={downstreamNotes}
                onChange={(e) => setDownstreamNotes(e.target.value)}
                placeholder="Third-party integrations, external APIs, legacy systems, and known limitations"
                rows={4}
                className="resize-none text-sm"
                disabled={loading}
              />
            </div>
          </div>

          {/* Modernisation */}
          <div className="space-y-1.5">
            <Label htmlFor="arch-modern" className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Modernisation / Migration Notes
              <Badge variant="gray" className="text-[10px] font-normal">Optional</Badge>
            </Label>
            <Textarea
              id="arch-modern"
              value={modernisationNotes}
              onChange={(e) => setModernNotes(e.target.value)}
              placeholder="Any planned migrations, re-platforming work, or strangler-fig patterns relevant to this question"
              rows={2}
              className="resize-none text-sm"
              disabled={loading}
            />
          </div>

          {/* Knowledge base toggle */}
          <div className="flex items-start gap-3 px-3 py-3 rounded-lg border border-border bg-muted/30">
            <button
              type="button"
              role="switch"
              aria-checked={useKnowledgeBase}
              onClick={() => setUseKnowledgeBase((v) => !v)}
              disabled={loading}
              className={`relative flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors mt-0.5 ${
                useKnowledgeBase ? 'bg-violet-600' : 'bg-muted-foreground/30'
              }`}
            >
              <span className={`absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                useKnowledgeBase ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`} />
            </button>
            <div>
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-violet-600" />
                Inject internal knowledge base
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Augment your context with the QE Savings Lab architecture reference (services, APIs, downstream systems, known risks)
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
              <Info className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 dark:text-rose-400">{error}</p>
            </div>
          )}

          <div className="flex flex-col items-end gap-1.5">
            <Button
              onClick={handleAnalyse}
              disabled={loading || !canAnalyse}
              className="gap-2 min-w-44 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</>
              ) : (
                <><Network className="h-4 w-4" /> Analyse Architecture</>
              )}
            </Button>
            {!canAnalyse && (
              <p className="text-[11px] text-muted-foreground">
                Enter your <span className="font-medium text-foreground">Engineering Question</span> to continue
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Output ── */}
      {record && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="purple">Architecture</Badge>
              <span className="text-xs text-muted-foreground">{record.id}</span>
            </div>
            <ExportMenu itemId={record.id} />
          </div>

          <ArchitectureOutputPanel record={record} />
        </>
      )}
    </div>
  )
}
