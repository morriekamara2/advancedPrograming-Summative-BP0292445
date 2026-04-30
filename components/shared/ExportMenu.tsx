'use client'

import { useState } from 'react'
import { Download, FileJson, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportMenuProps {
  itemId: string
  disabled?: boolean
}

export function ExportMenu({ itemId, disabled }: ExportMenuProps) {
  const [loading, setLoading] = useState<'json' | 'markdown' | null>(null)

  const handleExport = async (format: 'json' | 'markdown') => {
    setLoading(format)
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, format }),
      })

      if (!res.ok) throw new Error('Export failed')

      const data = await res.json()

      // Trigger browser download
      const blob = new Blob([data.content], {
        type: format === 'json' ? 'application/json' : 'text/markdown',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleExport('json')}
        disabled={disabled || loading !== null}
      >
        {loading === 'json' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileJson className="h-3.5 w-3.5" />
        )}
        Export JSON
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleExport('markdown')}
        disabled={disabled || loading !== null}
      >
        {loading === 'markdown' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5" />
        )}
        Export Markdown
      </Button>
    </div>
  )
}
