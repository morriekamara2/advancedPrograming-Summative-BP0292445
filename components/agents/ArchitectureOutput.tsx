'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Network,
  AlertTriangle,
  FlaskConical,
  Lightbulb,
  HelpCircle,
  ArrowRight,
  Copy,
  Check,
  Download,
  FileText,
  ShieldAlert,
  Boxes,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ArchitectureRecord } from '@/types'

// ─── Copy hook ────────────────────────────────────────────────────────────────

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    })
  }
  return { copy, copiedKey }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ArchitectureOutputPanelProps {
  record: ArchitectureRecord
}

// ─── List section helper ──────────────────────────────────────────────────────

function ListSection({
  title,
  icon,
  items,
  emptyText,
  variant = 'default',
}: {
  title: string
  icon: React.ReactNode
  items: string[]
  emptyText: string
  variant?: 'default' | 'risk' | 'success' | 'warning' | 'info'
}) {
  const rowClass = {
    default: 'border-border bg-muted/30',
    risk:    'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20',
    success: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20',
    warning: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20',
    info:    'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20',
  }[variant]

  const dotClass = {
    default: 'bg-muted-foreground',
    risk:    'bg-rose-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info:    'bg-blue-500',
  }[variant]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="gray" className="text-[10px] ml-auto">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn('flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm', rowClass)}
            >
              <span className={cn('mt-1.5 h-1.5 w-1.5 rounded-full shrink-0', dotClass)} />
              <span className="text-foreground leading-relaxed">{item}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ArchitectureOutputPanel({ record }: ArchitectureOutputPanelProps) {
  const { output, input } = record
  const { copy, copiedKey } = useCopy()

  const buildMarkdown = () => {
    const lines: string[] = [
      `# Architecture Analysis`,
      `> Question: ${input.question}`,
      ``,
      `## Summary`,
      output.summary,
      ``,
      `## Answer`,
      output.answer,
      ``,
      `## Impacted Components`,
      ...output.impactedComponents.map((c) => `- ${c}`),
      ``,
      `## Integration Risks`,
      ...output.integrationRisks.map((r) => `- ${r}`),
      ``,
      `## Test Implications`,
      ...output.testImplications.map((t) => `- ${t}`),
      ``,
      `## Assumptions`,
      ...output.assumptions.map((a) => `- ${a}`),
      ``,
      `## Missing Information`,
      ...output.missingInformation.map((m) => `- ${m}`),
      ``,
      `## Recommended Next Steps`,
      ...output.recommendedNextSteps.map((s, i) => `${i + 1}. ${s}`),
      ``,
      `---`,
      `*Exported from AI QE Control Tower · Architecture & Integration Agent*`,
    ]
    return lines.join('\n')
  }

  const downloadMarkdown = () => {
    const content = buildMarkdown()
    const slug = input.question.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arch-analysis-${slug}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Summary banner */}
      <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <div className="shrink-0 mt-0.5">
              <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <Network className="h-3.5 w-3.5 text-violet-700 dark:text-violet-400" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-300 mb-1">Analysis Summary</p>
              <p className="text-sm text-violet-800/80 dark:text-violet-400/80 leading-relaxed">{output.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Components', value: output.impactedComponents.length, color: 'text-blue-600' },
          { label: 'Risks',      value: output.integrationRisks.length,   color: 'text-rose-600' },
          { label: 'Test Areas', value: output.testImplications.length,    color: 'text-emerald-600' },
          { label: 'Next Steps', value: output.recommendedNextSteps.length, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center">
            <CardContent className="py-3">
              <div className={cn('text-xl font-bold', color)}>{value}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="answer">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="answer"    className="text-xs">Answer</TabsTrigger>
          <TabsTrigger value="components" className="text-xs">Components</TabsTrigger>
          <TabsTrigger value="risks"     className="text-xs">Integration Risks</TabsTrigger>
          <TabsTrigger value="testing"   className="text-xs">Test Implications</TabsTrigger>
          <TabsTrigger value="findings"  className="text-xs">Findings</TabsTrigger>
        </TabsList>

        {/* ── Answer ── */}
        <TabsContent value="answer" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-600" />
                  Architectural Answer
                </CardTitle>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => copy(output.answer, 'answer')}
                  >
                    {copiedKey === 'answer' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={downloadMarkdown}>
                    <Download className="h-3 w-3" />
                    Export .md
                  </Button>
                </div>
              </div>
              <div className="mt-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-medium text-muted-foreground">Question</p>
                <p className="text-sm text-foreground mt-0.5">{input.question}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {output.answer.split('\n\n').map((para, i) => (
                  <p key={i} className="text-sm text-foreground leading-relaxed mb-3 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Impacted Components ── */}
        <TabsContent value="components" className="mt-4">
          <Card>
            <CardContent className="pt-5 pb-5">
              <ListSection
                title="Impacted Components & Services"
                icon={<Boxes className="h-4 w-4 text-blue-600" />}
                items={output.impactedComponents}
                emptyText="No specific components identified."
                variant="info"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Integration Risks ── */}
        <TabsContent value="risks" className="mt-4">
          <Card>
            <CardContent className="pt-5 pb-5">
              <ListSection
                title="Integration Risks"
                icon={<ShieldAlert className="h-4 w-4 text-rose-600" />}
                items={output.integrationRisks}
                emptyText="No specific integration risks identified."
                variant="risk"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Test Implications ── */}
        <TabsContent value="testing" className="mt-4">
          <Card>
            <CardContent className="pt-5 pb-5">
              <ListSection
                title="Test Implications"
                icon={<FlaskConical className="h-4 w-4 text-emerald-600" />}
                items={output.testImplications}
                emptyText="No specific test implications identified."
                variant="success"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Findings (Assumptions + Missing Info + Next Steps) ── */}
        <TabsContent value="findings" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-5 pb-5">
              <ListSection
                title="Assumptions"
                icon={<Lightbulb className="h-4 w-4 text-amber-500" />}
                items={output.assumptions}
                emptyText="No assumptions recorded."
                variant="warning"
              />
            </CardContent>
          </Card>

          {output.missingInformation.length > 0 && (
            <Card>
              <CardContent className="pt-5 pb-5">
                <ListSection
                  title="Missing Information"
                  icon={<HelpCircle className="h-4 w-4 text-rose-500" />}
                  items={output.missingInformation}
                  emptyText="No missing information noted."
                  variant="risk"
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="h-4 w-4 text-violet-600" />
                  <h3 className="text-sm font-semibold text-foreground">Recommended Next Steps</h3>
                  <Badge variant="gray" className="text-[10px] ml-auto">{output.recommendedNextSteps.length}</Badge>
                </div>
                {output.recommendedNextSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 text-[10px] font-bold text-violet-700 dark:text-violet-400 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground leading-relaxed">{step}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export bar */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white border border-slate-700">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium">Analysis complete</span>
          <span className="text-xs text-slate-400">
            {output.integrationRisks.length} risks · {output.testImplications.length} test areas · {output.recommendedNextSteps.length} next steps
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5"
            onClick={() => copy(buildMarkdown(), 'all')}
          >
            {copiedKey === 'all' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            Copy All
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1.5" onClick={downloadMarkdown}>
            <Download className="h-3 w-3" />
            Download .md
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
