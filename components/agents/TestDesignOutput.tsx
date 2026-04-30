'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  HelpCircle,
  Tag,
  FileCode2,
  ArrowRight,
  CheckSquare,
  Square,
  Copy,
  Check,
  Download,
  ClipboardList,
  Sparkles,
  Ticket,
  BookOpen,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CodeBlock } from '@/components/shared/CodeBlock'
import { cn } from '@/lib/utils'
import { JiraCreateDialog } from '@/components/shared/JiraCreateDialog'
import { ConfluenceExportDialog } from '@/components/shared/ConfluenceExportDialog'
import type { TestDesignOutput, TestDesignRecord, TestDesignSelection } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestDesignOutputProps {
  record: TestDesignRecord
  onSendToAutomation?: (gherkin: string) => void
  onSelectionChange?: (selection: TestDesignSelection) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const priorityColors = {
  High: 'rose',
  Medium: 'warning',
  Low: 'gray',
} as const

const typeColors: Record<string, string> = {
  'happy-path': 'success',
  'edge-case': 'warning',
  negative: 'rose',
  boundary: 'info',
  security: 'purple',
  performance: 'gray',
}

function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const copy = useCallback(async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }, [])
  return { copy, copiedKey }
}

// ─── Checkbox Item Wrapper ────────────────────────────────────────────────────

function SelectableItem({
  checked,
  onToggle,
  children,
  className,
}: {
  checked: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border transition-all cursor-pointer group',
        checked
          ? 'border-primary/40 bg-primary/[0.03] shadow-sm'
          : 'border-border bg-card hover:border-primary/20 hover:bg-muted/30',
        className
      )}
      onClick={onToggle}
    >
      <div className="pt-4 pl-3 shrink-0">
        {checked ? (
          <CheckSquare className="h-4 w-4 text-primary" />
        ) : (
          <Square className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" />
        )}
      </div>
      <div className="flex-1 min-w-0 py-3 pr-3">{children}</div>
    </div>
  )
}

// ─── Section header with Select All ──────────────────────────────────────────

function SectionHeader({
  label,
  total,
  selectedCount,
  onSelectAll,
  onClearAll,
}: {
  label: string
  total: number
  selectedCount: number
  onSelectAll: () => void
  onClearAll: () => void
}) {
  const allSelected = selectedCount === total
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <Badge variant={selectedCount > 0 ? 'info' : 'gray'} className="text-xs">
          {selectedCount}/{total} selected
        </Badge>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-muted-foreground hover:text-foreground"
        onClick={allSelected ? onClearAll : onSelectAll}
      >
        {allSelected ? 'Deselect all' : 'Select all'}
      </Button>
    </div>
  )
}

// ─── Inline text item with checkbox ──────────────────────────────────────────

function SelectableTextItem({
  text,
  checked,
  onToggle,
  prefix,
}: {
  text: string
  checked: boolean
  onToggle: () => void
  prefix?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all group',
        checked
          ? 'border-primary/30 bg-primary/[0.03]'
          : 'border-transparent hover:border-border hover:bg-muted/20'
      )}
      onClick={onToggle}
    >
      <div className="shrink-0 mt-0.5">
        {checked ? (
          <CheckSquare className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Square className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
        )}
      </div>
      {prefix && (
        <span className="shrink-0 font-mono text-xs text-muted-foreground/60 mt-0.5 w-5">
          {prefix}
        </span>
      )}
      <span className="text-sm text-muted-foreground leading-relaxed">{text}</span>
    </div>
  )
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy', copyKey }: { text: string; label?: string; copyKey: string }) {
  const { copy, copiedKey } = useCopyToClipboard()
  const copied = copiedKey === copyKey
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs gap-1.5"
      onClick={(e) => { e.stopPropagation(); copy(text, copyKey) }}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied!' : label}
    </Button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TestDesignOutputPanel({ record, onSendToAutomation, onSelectionChange }: TestDesignOutputProps) {
  const output: TestDesignOutput = record.editedOutput
    ? { ...record.output, ...record.editedOutput }
    : record.output

  // Initialise selection from saved record state (survives page navigation)
  const [selection, setSelection] = useState<TestDesignSelection>(() => ({
    scenarioIds: record.selection?.scenarioIds ?? [],
    gherkinIds: record.selection?.gherkinIds ?? [],
    edgeCaseIndices: record.selection?.edgeCaseIndices ?? [],
    negativeCaseIndices: record.selection?.negativeCaseIndices ?? [],
  }))

  const { copy, copiedKey } = useCopyToClipboard()
  const [showJiraDialog, setShowJiraDialog] = useState(false)
  const [showConfluenceDialog, setShowConfluenceDialog] = useState(false)

  const totalSelected =
    selection.scenarioIds.length +
    selection.gherkinIds.length +
    selection.edgeCaseIndices.length +
    selection.negativeCaseIndices.length

  // Notify parent whenever selection changes so it can auto-save
  useEffect(() => {
    onSelectionChange?.(selection)
  }, [selection, onSelectionChange])

  // ── Selection helpers ──

  const toggleScenario = (id: string) =>
    setSelection((s) => ({
      ...s,
      scenarioIds: s.scenarioIds.includes(id)
        ? s.scenarioIds.filter((x) => x !== id)
        : [...s.scenarioIds, id],
    }))

  const toggleGherkin = (id: string) =>
    setSelection((s) => ({
      ...s,
      gherkinIds: s.gherkinIds.includes(id)
        ? s.gherkinIds.filter((x) => x !== id)
        : [...s.gherkinIds, id],
    }))

  const toggleEdgeCase = (idx: number) =>
    setSelection((s) => ({
      ...s,
      edgeCaseIndices: s.edgeCaseIndices.includes(idx)
        ? s.edgeCaseIndices.filter((x) => x !== idx)
        : [...s.edgeCaseIndices, idx],
    }))

  const toggleNegativeCase = (idx: number) =>
    setSelection((s) => ({
      ...s,
      negativeCaseIndices: s.negativeCaseIndices.includes(idx)
        ? s.negativeCaseIndices.filter((x) => x !== idx)
        : [...s.negativeCaseIndices, idx],
    }))

  // Select / clear all helpers
  const selectAllScenarios = () => setSelection((s) => ({ ...s, scenarioIds: output.scenarios.map((sc) => sc.id) }))
  const clearAllScenarios = () => setSelection((s) => ({ ...s, scenarioIds: [] }))
  const selectAllGherkin = () => setSelection((s) => ({ ...s, gherkinIds: output.gherkinScenarios.map((g) => g.id) }))
  const clearAllGherkin = () => setSelection((s) => ({ ...s, gherkinIds: [] }))
  const selectAllEdgeCases = () => setSelection((s) => ({ ...s, edgeCaseIndices: output.edgeCases.map((_, i) => i) }))
  const clearAllEdgeCases = () => setSelection((s) => ({ ...s, edgeCaseIndices: [] }))
  const selectAllNegative = () => setSelection((s) => ({ ...s, negativeCaseIndices: output.negativeCases.map((_, i) => i) }))
  const clearAllNegative = () => setSelection((s) => ({ ...s, negativeCaseIndices: [] }))

  // ── Selected items (derived) ──

  const selectedScenarios = output.scenarios.filter((s) => selection.scenarioIds.includes(s.id))
  const selectedGherkin = output.gherkinScenarios.filter((g) => selection.gherkinIds.includes(g.id))
  const selectedEdgeCases = output.edgeCases.filter((_, i) => selection.edgeCaseIndices.includes(i))
  const selectedNegativeCases = output.negativeCases.filter((_, i) => selection.negativeCaseIndices.includes(i))

  // ── Copy-ready text builders ──

  const gherkinCopyText = selectedGherkin.map((g) => g.steps).join('\n\n')
  const allGherkinText = output.gherkinScenarios.map((g) => g.steps).join('\n\n')

  const buildSelectionMarkdown = () => {
    const lines: string[] = []
    lines.push(`# Selected Test Artefacts`)
    lines.push(`> From: ${record.title}`)
    if (record.approvedBy) lines.push(`> Approved by: ${record.approvedBy}`)
    lines.push('')

    if (selectedScenarios.length > 0) {
      lines.push(`## Test Scenarios (${selectedScenarios.length})`)
      selectedScenarios.forEach((s, i) => {
        lines.push(`\n### ${i + 1}. ${s.title}`)
        lines.push(`**Priority:** ${s.priority} | **Type:** ${s.type} | **Tags:** ${s.tags.join(' ')}`)
        lines.push(`\n${s.description}`)
      })
    }

    if (selectedGherkin.length > 0) {
      lines.push(`\n## Gherkin Scenarios (${selectedGherkin.length})`)
      selectedGherkin.forEach((g) => {
        lines.push(`\n### ${g.title}`)
        if (g.tags.length > 0) lines.push(g.tags.join(' '))
        lines.push('```gherkin')
        lines.push(g.steps)
        lines.push('```')
      })
    }

    if (selectedEdgeCases.length > 0) {
      lines.push(`\n## Edge Cases (${selectedEdgeCases.length})`)
      selectedEdgeCases.forEach((e) => lines.push(`- ${e}`))
    }

    if (selectedNegativeCases.length > 0) {
      lines.push(`\n## Negative Cases (${selectedNegativeCases.length})`)
      selectedNegativeCases.forEach((n) => lines.push(`- ${n}`))
    }

    lines.push('\n---')
    lines.push('*Exported from AI QE Control Tower*')
    return lines.join('\n')
  }

  const downloadMarkdown = () => {
    const content = buildSelectionMarkdown()
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selected-artefacts-${record.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── BDD Feature File builder ──
  const buildFeatureFile = useCallback((): string => {
    const featureName = record.title.replace(/^\[.*?\]\s*/, '').trim()
    const lines: string[] = [
      `# Generated by AI QE Control Tower`,
      `# Story: ${record.title}`,
      `# Exported: ${new Date().toISOString().split('T')[0]}`,
      '',
      `Feature: ${featureName}`,
      '',
    ]

    selectedGherkin.forEach((g) => {
      // Normalise — strip any embedded Feature: line, ensure consistent indentation
      const scenarioLines = g.steps
        .split('\n')
        .filter((line) => !line.trim().startsWith('Feature:'))
        .map((line) => {
          const t = line.trim()
          if (!t) return ''
          if (t.startsWith('@') || /^Scenario(\s|:)/i.test(t) || /^Scenario Outline/i.test(t) || /^Examples/i.test(t) || /^Background/i.test(t)) {
            return `  ${t}`
          }
          return `    ${t}`
        })
      lines.push(...scenarioLines)
      lines.push('')
    })

    return lines.join('\n').trimEnd() + '\n'
  }, [record, selectedGherkin])

  const downloadFeatureFile = () => {
    if (selectedGherkin.length === 0) return
    const content = buildFeatureFile()
    const slug = record.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}.feature`
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
      <Card className="border-blue-100 bg-blue-50/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <div className="shrink-0 mt-0.5">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-blue-700" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Coverage Summary</p>
              <p className="text-sm text-blue-800/80 leading-relaxed">{output.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="scenarios">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="scenarios">
            Scenarios
            {selection.scenarioIds.length > 0 && (
              <Badge variant="info" className="ml-1.5 text-[10px]">{selection.scenarioIds.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gherkin">
            Gherkin
            {selection.gherkinIds.length > 0 && (
              <Badge variant="info" className="ml-1.5 text-[10px]">{selection.gherkinIds.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="edge-cases">
            Edge &amp; Negative
            {(selection.edgeCaseIndices.length + selection.negativeCaseIndices.length) > 0 && (
              <Badge variant="info" className="ml-1.5 text-[10px]">
                {selection.edgeCaseIndices.length + selection.negativeCaseIndices.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="selected" disabled={totalSelected === 0} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Selected
            {totalSelected > 0 && (
              <Badge variant="default" className="ml-1.5 text-[10px] bg-white/20 text-inherit">{totalSelected}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Scenarios ── */}
        <TabsContent value="scenarios" className="space-y-2">
          <SectionHeader
            label="Test Scenarios"
            total={output.scenarios.length}
            selectedCount={selection.scenarioIds.length}
            onSelectAll={selectAllScenarios}
            onClearAll={clearAllScenarios}
          />
          {output.scenarios.map((scenario) => (
            <SelectableItem
              key={scenario.id}
              checked={selection.scenarioIds.includes(scenario.id)}
              onToggle={() => toggleScenario(scenario.id)}
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">{scenario.title}</span>
                <Badge variant={priorityColors[scenario.priority] as never}>{scenario.priority}</Badge>
                <Badge variant={typeColors[scenario.type] as never || 'gray'}>
                  {scenario.type.replace('-', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{scenario.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {scenario.tags.map((tag) => (
                  <span key={tag} className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </SelectableItem>
          ))}
        </TabsContent>

        {/* ── Gherkin ── */}
        <TabsContent value="gherkin" className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeader
              label="Gherkin Scenarios"
              total={output.gherkinScenarios.length}
              selectedCount={selection.gherkinIds.length}
              onSelectAll={selectAllGherkin}
              onClearAll={clearAllGherkin}
            />
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {onSendToAutomation && (
              <Button size="sm" variant="outline" onClick={() => onSendToAutomation(allGherkinText)} className="gap-1.5 h-7 text-xs">
                <ArrowRight className="h-3 w-3 text-indigo-600" />
                Send all to Automation Agent
              </Button>
            )}
            {selection.gherkinIds.length > 0 && onSendToAutomation && (
              <Button size="sm" variant="outline" onClick={() => onSendToAutomation(gherkinCopyText)} className="gap-1.5 h-7 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                <ArrowRight className="h-3 w-3" />
                Send selected to Automation Agent
              </Button>
            )}
          </div>
          {output.gherkinScenarios.map((g) => (
            <SelectableItem
              key={g.id}
              checked={selection.gherkinIds.includes(g.id)}
              onToggle={() => toggleGherkin(g.id)}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileCode2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{g.title}</span>
                <div className="flex gap-1 flex-wrap">
                  {g.tags.map((t) => (
                    <span key={t} className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {/* Stop propagation on the code block so clicking it doesn't toggle checkbox */}
              <div onClick={(e) => e.stopPropagation()}>
                <CodeBlock code={g.steps} language="gherkin" maxHeight="260px" />
              </div>
            </SelectableItem>
          ))}
        </TabsContent>

        {/* ── Edge & Negative cases ── */}
        <TabsContent value="edge-cases" className="space-y-5">
          <div>
            <SectionHeader
              label="Edge Cases"
              total={output.edgeCases.length}
              selectedCount={selection.edgeCaseIndices.length}
              onSelectAll={selectAllEdgeCases}
              onClearAll={clearAllEdgeCases}
            />
            <div className="space-y-1">
              {output.edgeCases.map((ec, i) => (
                <SelectableTextItem
                  key={i}
                  text={ec}
                  checked={selection.edgeCaseIndices.includes(i)}
                  onToggle={() => toggleEdgeCase(i)}
                  prefix={String(i + 1).padStart(2, '0')}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionHeader
              label="Negative Cases"
              total={output.negativeCases.length}
              selectedCount={selection.negativeCaseIndices.length}
              onSelectAll={selectAllNegative}
              onClearAll={clearAllNegative}
            />
            <div className="space-y-1">
              {output.negativeCases.map((nc, i) => (
                <SelectableTextItem
                  key={i}
                  text={nc}
                  checked={selection.negativeCaseIndices.includes(i)}
                  onToggle={() => toggleNegativeCase(i)}
                  prefix={String(i + 1).padStart(2, '0')}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tags:</span>
            </div>
            {output.priorityTags.map((t) => (
              <span key={t} className="text-xs font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{t}</span>
            ))}
            {output.riskTags.map((t) => (
              <span key={t} className="text-xs font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded">{t}</span>
            ))}
          </div>
        </TabsContent>

        {/* ── Notes ── */}
        <TabsContent value="notes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Assumptions ({output.assumptions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {output.assumptions.map((a, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {a}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                  Open Questions ({output.questions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {output.questions.map((q, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="shrink-0 font-mono text-xs text-blue-500 mt-0.5">Q{i + 1}</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Selected export tab ── */}
        <TabsContent value="selected">
          <SelectedExportPanel
            record={record}
            selectedScenarios={selectedScenarios}
            selectedGherkin={selectedGherkin}
            selectedEdgeCases={selectedEdgeCases}
            selectedNegativeCases={selectedNegativeCases}
            copy={copy}
            copiedKey={copiedKey}
            onDownload={downloadMarkdown}
            onDownloadFeature={downloadFeatureFile}
            hasGherkin={selection.gherkinIds.length > 0}
            onCopyAll={() => copy(buildSelectionMarkdown(), 'all')}
            allCopied={copiedKey === 'all'}
          />
        </TabsContent>
      </Tabs>

      {/* ── Sticky selection bar (visible when items selected, not on Selected tab) ── */}
      <AnimatePresence>
        {totalSelected > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="sticky bottom-4 z-10"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-medium">
                  {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
                </span>
                <span className="text-xs text-slate-400">
                  ({selection.scenarioIds.length} scenarios · {selection.gherkinIds.length} Gherkin · {selection.edgeCaseIndices.length + selection.negativeCaseIndices.length} cases)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selection.gherkinIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5"
                    onClick={() => copy(gherkinCopyText, 'gherkin-bar')}
                  >
                    {copiedKey === 'gherkin-bar' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    Copy Gherkin
                  </Button>
                )}
                {selection.gherkinIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5"
                    onClick={downloadFeatureFile}
                  >
                    <FileCode2 className="h-3 w-3" />
                    Download .feature
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={downloadMarkdown}
                >
                  <Download className="h-3 w-3" />
                  Download .md
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border-0"
                  onClick={() => setShowJiraDialog(true)}
                >
                  <Ticket className="h-3 w-3" />
                  Create in Jira
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5"
                  onClick={() => setShowConfluenceDialog(true)}
                >
                  <BookOpen className="h-3 w-3" />
                  Confluence
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <JiraCreateDialog
        open={showJiraDialog}
        onClose={() => setShowJiraDialog(false)}
        selectedScenarios={selectedScenarios}
        selectedGherkin={selectedGherkin}
        selectedEdgeCases={selectedEdgeCases}
        selectedNegativeCases={selectedNegativeCases}
      />

      <ConfluenceExportDialog
        open={showConfluenceDialog}
        onClose={() => setShowConfluenceDialog(false)}
        storyTitle={record.title}
        selectedScenarios={selectedScenarios}
        selectedGherkin={selectedGherkin}
        selectedEdgeCases={selectedEdgeCases}
        selectedNegativeCases={selectedNegativeCases}
      />
    </motion.div>
  )
}

// ─── Selected Export Panel ────────────────────────────────────────────────────

function SelectedExportPanel({
  record,
  selectedScenarios,
  selectedGherkin,
  selectedEdgeCases,
  selectedNegativeCases,
  copy,
  copiedKey,
  onDownload,
  onDownloadFeature,
  hasGherkin,
  onCopyAll,
  allCopied,
}: {
  record: TestDesignRecord
  selectedScenarios: ReturnType<typeof Array.prototype.filter>
  selectedGherkin: ReturnType<typeof Array.prototype.filter>
  selectedEdgeCases: string[]
  selectedNegativeCases: string[]
  copy: (text: string, key: string) => void
  copiedKey: string | null
  onDownload: () => void
  onDownloadFeature: () => void
  hasGherkin: boolean
  onCopyAll: () => void
  allCopied: boolean
}) {
  const isApproved = record.status === 'approved'
  const totalSelected = selectedScenarios.length + selectedGherkin.length + selectedEdgeCases.length + selectedNegativeCases.length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Selected Artefacts</span>
            {isApproved && (
              <Badge variant="success" className="text-[10px]">Approved</Badge>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {totalSelected} item{totalSelected !== 1 ? 's' : ''} ready to export
            {isApproved ? ' — approved and ready to use' : ' — submit for approval first to finalise'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-transparent border-slate-600 text-slate-200 hover:bg-slate-700 gap-1.5"
            onClick={onCopyAll}
          >
            {allCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {allCopied ? 'Copied!' : 'Copy All Markdown'}
          </Button>
          {hasGherkin && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-transparent border-indigo-500 text-indigo-300 hover:bg-indigo-900/40 gap-1.5"
              onClick={onDownloadFeature}
            >
              <FileCode2 className="h-3 w-3" />
              Download .feature
            </Button>
          )}
          <Button size="sm" className="h-7 text-xs gap-1.5" onClick={onDownload}>
            <Download className="h-3 w-3" />
            Download .md
          </Button>
        </div>
      </div>

      {!isApproved && (
        <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>Awaiting approval.</strong> You can see and copy your selection below, but the official export is locked until this record is approved.
          </p>
        </div>
      )}

      {/* Sections — shown regardless of approval so user can preview */}
      {selectedScenarios.length > 0 && (
        <ExportSection
          title={`Test Scenarios (${selectedScenarios.length})`}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          copyText={selectedScenarios.map((s: import('@/types').TestScenario, i: number) =>
            `${i + 1}. ${s.title}\nPriority: ${s.priority} | Type: ${s.type}\n${s.description}`
          ).join('\n\n')}
          copyKey="scenarios-section"
          copiedKey={copiedKey}
          copy={copy}
        >
          <div className="space-y-3">
            {selectedScenarios.map((s: import('@/types').TestScenario, i: number) => (
              <div key={s.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm font-medium">{s.title}</span>
                  <Badge variant={priorityColors[s.priority] as never}>{s.priority}</Badge>
                  <Badge variant={typeColors[s.type] as never || 'gray'}>{s.type.replace('-', ' ')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground pl-6">{s.description}</p>
                <div className="flex flex-wrap gap-1 mt-1.5 pl-6">
                  {s.tags.map((tag: string) => (
                    <span key={tag} className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ExportSection>
      )}

      {selectedGherkin.length > 0 && (
        <ExportSection
          title={`Gherkin Scenarios (${selectedGherkin.length})`}
          icon={<FileCode2 className="h-4 w-4 text-indigo-500" />}
          copyText={selectedGherkin.map((g: import('@/types').GherkinScenario) => g.steps).join('\n\n')}
          copyKey="gherkin-section"
          copiedKey={copiedKey}
          copy={copy}
          copyLabel="Copy Raw Gherkin"
        >
          <div className="space-y-3">
            {selectedGherkin.map((g: import('@/types').GherkinScenario) => (
              <div key={g.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium">{g.title}</span>
                  {g.tags.map((t: string) => (
                    <span key={t} className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
                <CodeBlock code={g.steps} language="gherkin" maxHeight="300px" />
              </div>
            ))}
          </div>
        </ExportSection>
      )}

      {(selectedEdgeCases.length > 0 || selectedNegativeCases.length > 0) && (
        <ExportSection
          title={`Cases (${selectedEdgeCases.length + selectedNegativeCases.length})`}
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          copyText={[
            selectedEdgeCases.length > 0 ? `Edge Cases:\n${selectedEdgeCases.map((e) => `- ${e}`).join('\n')}` : '',
            selectedNegativeCases.length > 0 ? `Negative Cases:\n${selectedNegativeCases.map((n) => `- ${n}`).join('\n')}` : '',
          ].filter(Boolean).join('\n\n')}
          copyKey="cases-section"
          copiedKey={copiedKey}
          copy={copy}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {selectedEdgeCases.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500" /> Edge Cases
                </p>
                <ul className="space-y-1">
                  {selectedEdgeCases.map((e, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-amber-500 font-mono text-xs shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedNegativeCases.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <XCircle className="h-3 w-3 text-rose-500" /> Negative Cases
                </p>
                <ul className="space-y-1">
                  {selectedNegativeCases.map((n, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-rose-500 font-mono text-xs shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ExportSection>
      )}

      {totalSelected === 0 && (
        <div className="py-16 text-center">
          <CheckSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No items selected yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Use the checkboxes in the Scenarios, Gherkin, and Edge Cases tabs to build your selection.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Export section card ──────────────────────────────────────────────────────

function ExportSection({
  title,
  icon,
  children,
  copyText,
  copyKey,
  copiedKey,
  copy,
  copyLabel = 'Copy',
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  copyText: string
  copyKey: string
  copiedKey: string | null
  copy: (text: string, key: string) => void
  copyLabel?: string
}) {
  const copied = copiedKey === copyKey
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5"
            onClick={() => copy(copyText, copyKey)}
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied!' : copyLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}
