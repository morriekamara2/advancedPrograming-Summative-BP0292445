'use client'

import { motion } from 'framer-motion'
import {
  ShieldAlert,
  Gauge,
  Zap,
  ListChecks,
  FileWarning,
  ArrowUpRight,
  MapPin,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { FailureAnalysisRecord } from '@/types'

interface FailureAnalysisOutputProps {
  record: FailureAnalysisRecord
  onSendToAutomation?: () => void
}

const categoryConfig = {
  'real-defect': { label: 'Real Defect', color: 'rose', icon: ShieldAlert },
  flaky: { label: 'Likely Flaky', color: 'warning', icon: Zap },
  environment: { label: 'Environment Issue', color: 'info', icon: ShieldAlert },
  'test-code': { label: 'Test Code Issue', color: 'indigo', icon: ShieldAlert },
  'data-issue': { label: 'Data Issue', color: 'warning', icon: ShieldAlert },
} as const

const confidenceConfig = {
  High: { label: 'High Confidence', variant: 'success' },
  Medium: { label: 'Medium Confidence', variant: 'warning' },
  Low: { label: 'Low Confidence', variant: 'rose' },
} as const

export function FailureAnalysisOutputPanel({ record, onSendToAutomation }: FailureAnalysisOutputProps) {
  const output = record.editedOutput ? { ...record.output, ...record.editedOutput } : record.output

  const categoryInfo = categoryConfig[output.failureCategory]
  const CategoryIcon = categoryInfo.icon
  const confidenceInfo = confidenceConfig[output.confidenceLevel]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Hero Classification Card */}
      <Card className={output.failureCategory === 'real-defect' ? 'border-rose-200 bg-rose-50/30' : output.failureCategory === 'flaky' ? 'border-amber-200 bg-amber-50/30' : 'border-blue-200 bg-blue-50/30'}>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className={`p-3 rounded-xl ${output.failureCategory === 'real-defect' ? 'bg-rose-100' : output.failureCategory === 'flaky' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <CategoryIcon className={`h-6 w-6 ${output.failureCategory === 'real-defect' ? 'text-rose-600' : output.failureCategory === 'flaky' ? 'text-amber-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="text-base font-semibold text-foreground">
                  {categoryInfo.label}
                </h3>
                <Badge variant={confidenceInfo.variant as never}>
                  {confidenceInfo.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {output.summary}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Root Cause */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Root Cause Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed">{output.rootCause}</p>
        </CardContent>
      </Card>

      {/* Flakiness Assessment */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Flakiness Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed">{output.flakynessAssessment}</p>
        </CardContent>
      </Card>

      {/* Next Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-emerald-500" />
            Suggested Next Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ol className="space-y-2">
            {output.suggestedNextActions.map((action, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  {i + 1}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Locator Recommendations */}
      {output.locatorRecommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-500" />
              Locator Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {output.locatorRecommendations.map((loc, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="info">{loc.strategy}</Badge>
                  <code className="text-xs font-mono text-foreground">{loc.value}</code>
                </div>
                <p className="text-xs text-muted-foreground">{loc.rationale}</p>
              </div>
            ))}
            {onSendToAutomation && (
              <Button size="sm" variant="outline" onClick={onSendToAutomation} className="mt-2 gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                Send to Automation Agent
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Draft Defect Note */}
      <Card className="border-rose-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-rose-500" />
            Draft Defect / Triage Note
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg bg-slate-950 p-4 overflow-auto max-h-64">
            <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap">{output.draftDefectNote}</pre>
          </div>
          <p className="text-xs text-muted-foreground mt-2 italic">
            This draft is an AI recommendation. Review before filing a defect.
          </p>
        </CardContent>
      </Card>

      {/* Escalation */}
      <Card className="border-slate-200 bg-slate-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-slate-500" />
            Escalation Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed">{output.escalationNotes}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
