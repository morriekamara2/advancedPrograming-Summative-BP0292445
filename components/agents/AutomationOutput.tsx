'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Lightbulb, MapPin, Wrench } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '@/components/shared/CodeBlock'
import type { AutomationRecord } from '@/types'

interface AutomationOutputProps {
  record: AutomationRecord
}

export function AutomationOutputPanel({ record }: AutomationOutputProps) {
  const output = record.editedOutput ? { ...record.output, ...record.editedOutput } : record.output

  const strategyColor: Record<string, string> = {
    'data-testid': 'success',
    role: 'info',
    text: 'warning',
    label: 'warning',
    placeholder: 'gray',
    css: 'gray',
    xpath: 'rose',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Warnings */}
      {output.warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 mb-2">Warnings</p>
                <ul className="space-y-1">
                  {output.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-amber-800/80">⚠ {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="code">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="code">Full Code</TabsTrigger>
          <TabsTrigger value="steps">
            Step Definitions ({output.stepDefinitions.length})
          </TabsTrigger>
          <TabsTrigger value="locators">
            Locators ({output.locators.length})
          </TabsTrigger>
          <TabsTrigger value="notes">Notes & Helpers</TabsTrigger>
        </TabsList>

        {/* Full Code */}
        <TabsContent value="code">
          <CodeBlock
            code={output.fullCode}
            language="typescript"
            title="automation-draft.ts"
            maxHeight="600px"
          />
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800">
              <strong>Review required.</strong> This is an AI-generated draft. Do not commit directly — review locators, imports, and step patterns against your existing framework before use.
            </p>
          </div>
        </TabsContent>

        {/* Step Definitions */}
        <TabsContent value="steps" className="space-y-3">
          {output.stepDefinitions.map((step) => (
            <Card key={step.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant={step.keyword === 'Given' ? 'info' : step.keyword === 'When' ? 'warning' : 'success'}>
                    {step.keyword}
                  </Badge>
                  <code className="text-sm font-mono text-foreground">{step.pattern}</code>
                </div>
                <CodeBlock
                  code={step.implementation}
                  language="typescript"
                  maxHeight="200px"
                />
                {step.imports.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">Imports:</span>
                    {step.imports.map((imp, i) => (
                      <code key={i} className="text-xs font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {imp}
                      </code>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Locators */}
        <TabsContent value="locators" className="space-y-3">
          {output.pageObjects.map((po) => (
            <Card key={po.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-indigo-500" />
                  {po.name}
                  <code className="text-xs text-muted-foreground font-normal">{po.filePath}</code>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {po.locators.map((loc, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                      <Badge variant={strategyColor[loc.strategy] as never || 'gray'} className="text-[10px] shrink-0 mt-0.5">
                        {loc.strategy}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <code className="text-xs font-mono text-foreground">{loc.name}</code>
                        <code className="block text-xs font-mono text-muted-foreground mt-0.5 truncate">
                          {loc.value}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">{loc.rationale}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Methods:</p>
                  <div className="flex flex-wrap gap-1">
                    {po.methods.map((m, i) => (
                      <code key={i} className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {m}
                      </code>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-indigo-500" />
                  Helper Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {output.helperSuggestions.map((h, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      {h}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Implementation Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {output.implementationNotes.map((n, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {n}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {output.assumptions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Assumptions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1">
                  {output.assumptions.map((a, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="shrink-0 font-mono text-xs text-slate-400 mt-0.5">{i + 1}.</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
