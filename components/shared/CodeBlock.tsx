'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  className?: string
  maxHeight?: string
}

export function CodeBlock({ code, language = 'typescript', title, className, maxHeight = '500px' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          {title && <span className="text-slate-400 text-xs font-mono ml-2">{title}</span>}
          {!title && language && (
            <span className="text-slate-500 text-xs font-mono ml-2">{language}</span>
          )}
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={handleCopy}
          className="text-slate-400 hover:text-slate-200 hover:bg-slate-700"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div
        className="overflow-auto bg-slate-950 p-4"
        style={{ maxHeight }}
      >
        <pre className="text-sm font-mono text-slate-300 leading-relaxed whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}
