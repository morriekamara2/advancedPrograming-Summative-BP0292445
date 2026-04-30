import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { FlaskConical } from 'lucide-react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {/* Subtle dot-grid texture on the content area */}
          <div className="min-h-full relative">
            <div className="absolute inset-0 dot-grid opacity-40 dark:opacity-20 pointer-events-none" />
            <div className="relative p-6 max-w-7xl mx-auto w-full page-enter">
              {children}
            </div>
          </div>
        </main>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="shrink-0 border-t border-border bg-background/80 backdrop-blur-sm px-6 py-3">
          <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-indigo-600">
                <FlaskConical className="h-3 w-3 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">
                Created by{' '}
                <span className="font-semibold text-foreground">James Bong</span>
                {' '}·{' '}
                <span className="font-medium text-foreground">QE Savings Lab</span>
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              AI QE Control Tower · v0.1.0 · {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
