'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FlaskConical,
  Code2,
  AlertTriangle,
  ClipboardCheck,
  History,
  ChevronRight,
  Cpu,
  Zap,
  Network,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'AGENTS',
    isHeader: true,
  },
  {
    label: 'Test Design',
    href: '/agents/test-design',
    icon: FlaskConical,
    description: 'Scenarios · Gherkin · Coverage',
    accent: 'blue',
  },
  {
    label: 'Automation',
    href: '/agents/automation',
    icon: Code2,
    description: 'Playwright · Step defs · POM',
    accent: 'indigo',
  },
  {
    label: 'Failure Analysis',
    href: '/agents/failure-analysis',
    icon: AlertTriangle,
    description: 'Triage · Root cause · Defects',
    accent: 'rose',
  },
  {
    label: 'Architecture',
    href: '/agents/architecture',
    icon: Network,
    description: 'Systems · APIs · Integration risks',
    accent: 'violet',
  },
  {
    label: 'GOVERNANCE',
    isHeader: true,
  },
  {
    label: 'Approval Queue',
    href: '/approvals',
    icon: ClipboardCheck,
    accent: 'amber',
  },
  {
    label: 'History & Audit',
    href: '/history',
    icon: History,
    accent: 'slate',
  },
]

// Icon accent colours (all on the dark sidebar)
const accentIconClass: Record<string, string> = {
  blue:   'text-blue-400 group-data-[active]:text-blue-300',
  indigo: 'text-indigo-400 group-data-[active]:text-indigo-300',
  rose:   'text-rose-400 group-data-[active]:text-rose-300',
  amber:  'text-amber-400 group-data-[active]:text-amber-300',
  slate:  'text-slate-400 group-data-[active]:text-slate-300',
  violet: 'text-violet-400 group-data-[active]:text-violet-300',
}
const accentBgClass: Record<string, string> = {
  blue:   'bg-blue-500/15',
  indigo: 'bg-indigo-500/15',
  rose:   'bg-rose-500/15',
  amber:  'bg-amber-500/15',
  slate:  'bg-slate-500/15',
  violet: 'bg-violet-500/15',
}

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-hidden"
      style={{ background: 'hsl(var(--sidebar-bg))' }}
    >
      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div
        className="px-4 py-5 flex items-center gap-3"
        style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
      >
        {/* Icon mark with glow */}
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 shrink-0">
          <Cpu className="h-5 w-5 text-white" />
          {/* Subtle glow ring */}
          <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
        </div>
        <div>
          <div
            className="text-sm font-bold leading-tight"
            style={{ color: 'hsl(var(--sidebar-fg))' }}
          >
            AI QE Control
          </div>
          <div
            className="text-[11px] leading-tight font-medium"
            style={{ color: 'hsl(var(--sidebar-muted))' }}
          >
            Tower · v0.1.0
          </div>
        </div>

        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {navItems.map((item, i) => {
          if ('isHeader' in item && item.isHeader) {
            return (
              <div key={i} className="px-3 pt-4 pb-1.5">
                <span
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: 'hsl(var(--sidebar-muted))' }}
                >
                  {item.label}
                </span>
              </div>
            )
          }

          if (!item.href) return null

          const active = isActive(item.href)
          const Icon = item.icon!
          const accentKey = item.accent ?? 'slate'

          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active ? '' : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150',
                active
                  ? 'bg-white/10 shadow-sm'
                  : 'hover:bg-white/5'
              )}
            >
              {/* Left active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
              )}

              {/* Icon container */}
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-all shrink-0',
                  active
                    ? accentBgClass[accentKey]
                    : 'bg-white/5 group-hover:bg-white/10'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-colors',
                    active
                      ? accentIconClass[accentKey].split(' ')[1] // active colour
                      : accentIconClass[accentKey].split(' ')[0]  // base colour
                  )}
                />
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm leading-tight font-medium transition-colors',
                    active
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-slate-200'
                  )}
                >
                  {item.label}
                </div>
                {item.description && !active && (
                  <div
                    className="text-[10px] leading-tight mt-0.5 truncate"
                    style={{ color: 'hsl(var(--sidebar-muted))' }}
                  >
                    {item.description}
                  </div>
                )}
              </div>

              {active && (
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Footer / AI status ──────────────────────────────────────────── */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}
      >
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-blue-500/30 shrink-0">
            <Zap className="h-3.5 w-3.5 text-violet-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-300 leading-tight truncate">
              {process.env.NEXT_PUBLIC_AI_PROVIDER === 'gemini'
                ? 'Gemini 2.5 Flash'
                : process.env.NEXT_PUBLIC_AI_PROVIDER === 'mock'
                  ? 'Mock Provider'
                  : (process.env.NEXT_PUBLIC_AI_PROVIDER ?? 'AI Provider')}
            </div>
            <div
              className="text-[10px] leading-tight"
              style={{ color: 'hsl(var(--sidebar-muted))' }}
            >
              AI_PROVIDER ·{' '}
              <span
                className={
                  process.env.NEXT_PUBLIC_AI_PROVIDER === 'mock'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }
              >
                {process.env.NEXT_PUBLIC_AI_PROVIDER === 'mock' ? 'demo' : 'live'}
              </span>
            </div>
          </div>
          <div
            className={cn(
              'h-2 w-2 rounded-full shrink-0 shadow-sm',
              process.env.NEXT_PUBLIC_AI_PROVIDER === 'mock'
                ? 'bg-amber-400 shadow-amber-400/40 animate-pulse'
                : 'bg-emerald-400 shadow-emerald-400/40 animate-pulse'
            )}
          />
        </div>
      </div>
    </aside>
  )
}
