/**
 * AI Provider abstraction layer — lib/providers/index.ts
 *
 * This module defines the AIProvider interface and the factory function
 * that resolves which concrete implementation to use at runtime.
 *
 * ACADEMIC REQUIREMENT — Input and Output:
 *   The AIProvider interface declares four methods, each with a clearly typed
 *   input parameter and a typed Promise return value. Every layer of the
 *   application that calls an agent does so through this interface — meaning
 *   no part of the codebase outside this folder knows whether it is talking
 *   to Gemini, a mock, or Vertex AI. This is the Strategy design pattern.
 *
 * ACADEMIC REQUIREMENT — Error Handling:
 *   The getProvider() factory throws a descriptive Error if an unrecognised
 *   provider name is configured. The error message includes the exact value
 *   that was received and the valid options, making misconfiguration
 *   immediately identifiable during development and deployment.
 *
 * Provider resolution order (highest → lowest priority):
 *   1. Runtime override stored in data/settings/provider.json
 *      (set via POST /api/settings/provider — the in-app toggle)
 *   2. AI_PROVIDER environment variable in .env.local
 *   3. Falls back to 'gemini'
 *
 * This lets users toggle between AI and Mock at runtime without
 * restarting the dev server or editing .env.local.
 */

import type {
  TestDesignInput,
  TestDesignOutput,
  AutomationInput,
  AutomationOutput,
  FailureAnalysisInput,
  FailureAnalysisOutput,
  ArchitectureInput,
  ArchitectureOutput,
} from '@/types'

// ─── Provider Interface ───────────────────────────────────────────────────────

export interface AIProvider {
  /** Generate test scenarios, Gherkin, edge cases, and risk tags from a story. */
  generateTestDesign(input: TestDesignInput): Promise<TestDesignOutput>

  /** Generate Playwright BDD step definitions and page object stubs. */
  generateAutomationDraft(input: AutomationInput): Promise<AutomationOutput>

  /** Analyse a Playwright failure log and produce a triage summary. */
  analyzeFailure(input: FailureAnalysisInput): Promise<FailureAnalysisOutput>

  /** Analyse architecture context and return structured integration analysis. */
  analyzeArchitecture(input: ArchitectureInput): Promise<ArchitectureOutput>
}

// ─── Runtime override (read from settings file) ───────────────────────────────

function getRuntimeOverride(): string | null {
  try {
    // Lazy-require fs so this module stays compatible with edge runtimes if needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path')
    const filePath = path.join(process.cwd(), 'data', 'settings', 'provider.json')
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as { mode?: string }
    return parsed.mode ?? null
  } catch {
    return null
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getProvider(): AIProvider {
  // Runtime override wins; env var is the fallback
  const providerName = getRuntimeOverride() ?? process.env.AI_PROVIDER ?? 'gemini'

  switch (providerName) {
    case 'gemini': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { GeminiProvider } = require('./gemini') as { GeminiProvider: new () => AIProvider }
      return new GeminiProvider()
    }
    case 'mock': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MockProvider } = require('./mock') as { MockProvider: new () => AIProvider }
      return new MockProvider()
    }
    case 'vertex': {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { VertexProvider } = require('./vertex') as { VertexProvider: new () => AIProvider }
      return new VertexProvider()
    }
    default:
      throw new Error(
        `[AI Provider] Unknown provider: "${providerName}".\n` +
        'Set AI_PROVIDER in .env.local to one of: gemini | mock | vertex'
      )
  }
}
