/**
 * Provider Settings API
 *
 * GET  /api/settings/provider  → returns { mode: 'mock' | 'gemini' | ... }
 * POST /api/settings/provider  → body { mode: 'mock' | 'ai' }, persists to data/settings/provider.json
 *
 * The stored value overrides AI_PROVIDER env var at runtime (see lib/providers/index.ts).
 * "ai" resolves to whatever AI_PROVIDER is set to in .env.local (default: gemini).
 * "mock" always resolves to the MockProvider.
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const SETTINGS_DIR = path.join(process.cwd(), 'data', 'settings')
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'provider.json')

function ensureDir() {
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true })
  }
}

function readCurrent(): string {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return 'ai'
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as { mode?: string }
    return parsed.mode ?? 'ai'
  } catch {
    return 'ai'
  }
}

export async function GET() {
  const mode = readCurrent()
  return NextResponse.json({ mode })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { mode?: string }
    const requested = body.mode

    if (requested !== 'mock' && requested !== 'ai') {
      return NextResponse.json({ error: 'mode must be "mock" or "ai"' }, { status: 400 })
    }

    ensureDir()

    // "ai" → store the real provider name so getProvider() resolves correctly
    const resolved = requested === 'mock'
      ? 'mock'
      : (process.env.AI_PROVIDER ?? 'gemini')

    // "ai" mode: remove the override file so the env var takes over naturally
    if (requested === 'ai') {
      if (fs.existsSync(SETTINGS_FILE)) fs.unlinkSync(SETTINGS_FILE)
      return NextResponse.json({ mode: 'ai', resolved })
    }

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ mode: 'mock' }, null, 2), 'utf-8')
    return NextResponse.json({ mode: 'mock', resolved: 'mock' })
  } catch (error) {
    console.error('[settings/provider] Error:', error)
    return NextResponse.json({ error: 'Failed to update provider setting' }, { status: 500 })
  }
}
