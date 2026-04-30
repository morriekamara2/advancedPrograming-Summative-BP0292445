'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/providers/ThemeProvider'
import { Bell, Sun, Moon, ChevronRight, Sparkles, Box, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const pageTitles: Record<string, { title: string; description: string; breadcrumb?: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    description: 'Overview of AI-assisted QE activity',
  },
  '/agents/test-design': {
    title: 'Test Design Agent',
    description: 'Generate test scenarios, Gherkin, and coverage analysis from user stories',
    breadcrumb: 'Agents',
  },
  '/agents/automation': {
    title: 'Automation Agent',
    description: 'Generate Playwright BDD step definitions and page object stubs',
    breadcrumb: 'Agents',
  },
  '/agents/failure-analysis': {
    title: 'Failure Analysis Agent',
    description: 'Triage Playwright test failures and generate defect notes',
    breadcrumb: 'Agents',
  },
  '/agents/architecture': {
    title: 'Architecture & Integration Agent',
    description: 'Analyse microservices, APIs, integration risks, and testing implications',
    breadcrumb: 'Agents',
  },
  '/approvals': {
    title: 'Approval Queue',
    description: 'Review and approve AI-generated artefacts before use',
    breadcrumb: 'Governance',
  },
  '/history': {
    title: 'History & Audit',
    description: 'Full audit trail of all AI-generated and approved artefacts',
    breadcrumb: 'Governance',
  },
}

export function Header() {
  const pathname = usePathname()
  const page = pageTitles[pathname] ?? { title: 'AI QE Control Tower', description: '' }

  const { resolvedTheme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // ─ Provider toggle
  const [providerMode, setProviderMode] = useState<'ai' | 'mock'>('ai')
  const [providerSwitching, setProviderSwitching] = useState(false)

  useEffect(() => {
    fetch('/api/settings/provider')
      .then((r) => r.json())
      .then((d: { mode: string }) => setProviderMode(d.mode === 'mock' ? 'mock' : 'ai'))
      .catch(() => {})
  }, [])

  const toggleProvider = useCallback(async () => {
    const next = providerMode === 'ai' ? 'mock' : 'ai'
    setProviderSwitching(true)
    try {
      await fetch('/api/settings/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: next }),
      })
      setProviderMode(next)
    } catch {
      // revert on error
    } finally {
      setProviderSwitching(false)
    }
  }, [providerMode])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur-md">
      {/* Left: breadcrumb + title */}
      <div>
        {page.breadcrumb && (
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-wider">
              {page.breadcrumb}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
              {page.title}
            </span>
          </div>
        )}
        <h1 className={cn(
          'font-semibold leading-tight',
          page.breadcrumb ? 'text-base' : 'text-lg gradient-text'
        )}>
          {page.breadcrumb ? page.title : page.title}
        </h1>
        {page.description && (
          <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{page.description}</p>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5">
        {/* Provider toggle */}
        <button
          onClick={toggleProvider}
          disabled={providerSwitching}
          title={providerMode === 'ai' ? 'Switch to Mock (save tokens)' : 'Switch to AI provider'}
          className={cn(
            'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-semibold tracking-wide transition-all',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            providerMode === 'ai'
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-400/10 dark:border-emerald-400/20 dark:hover:bg-emerald-400/20'
              : 'bg-amber-500/10 border-amber-500/25 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 dark:bg-amber-400/10 dark:border-amber-400/20 dark:hover:bg-amber-400/20'
          )}
        >
          {providerSwitching ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : providerMode === 'ai' ? (
            <Sparkles className="h-3 w-3" />
          ) : (
            <Box className="h-3 w-3" />
          )}
          <span>{providerMode === 'ai' ? 'AI' : 'MOCK'}</span>
          {/* Toggle track */}
          <span className={cn(
            'flex items-center w-7 h-4 rounded-full p-0.5 transition-colors',
            providerMode === 'ai' ? 'bg-emerald-500 dark:bg-emerald-500' : 'bg-amber-400 dark:bg-amber-400'
          )}>
            <span className={cn(
              'h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
              providerMode === 'ai' ? 'translate-x-3' : 'translate-x-0'
            )} />
          </span>
        </button>

        {/* Bell */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
        </Button>

        {/* Theme toggle */}
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleTheme}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mounted && resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Divider */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* User avatar */}
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm ring-2 ring-background">
              <span className="text-xs font-bold text-white">JB</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
              James Bong
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              QE Savings Lab
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
