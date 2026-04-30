/**
 * Google Gemini Provider (Google AI Studio — API key auth)
 *
 * Uses the official @google/generative-ai SDK.
 * Authentication is via GEMINI_API_KEY — NOT Vertex AI service account.
 *
 * Environment variables required in .env.local:
 *   GEMINI_API_KEY=your-api-key-from-aistudio.google.com
 *   GEMINI_MODEL=gemini-2.5-flash   (or gemini-1.5-pro, gemini-1.5-flash, etc.)
 *
 * This runs SERVER-SIDE ONLY inside Next.js API routes.
 * The API key is never exposed to the browser.
 *
 * To swap to Vertex AI later: implement lib/providers/vertex.ts
 * and set AI_PROVIDER=vertex. Nothing else changes.
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai'
import type { AIProvider } from './index'
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
import {
  TestDesignOutputSchema,
  AutomationOutputSchema,
  FailureAnalysisOutputSchema,
  ArchitectureOutputSchema,
} from '@/lib/schemas'
import { buildTestDesignPrompt } from '@/lib/prompts/test-design'
import { buildAutomationPrompt } from '@/lib/prompts/automation'
import { buildFailureAnalysisPrompt } from '@/lib/prompts/failure-analysis'
import { buildArchitecturePrompt } from '@/lib/prompts/architecture'

export class GeminiProvider implements AIProvider {
  private model: GenerativeModel

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error(
        '[GeminiProvider] GEMINI_API_KEY is not set.\n' +
        'Add it to .env.local: GEMINI_API_KEY=your-key-from-aistudio.google.com'
      )
    }

    const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
    const client = new GoogleGenerativeAI(apiKey)

    // responseMimeType: 'application/json' tells Gemini to return valid JSON only.
    // This eliminates markdown fences and prose wrapping around the JSON.
    this.model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,       // Lower = more deterministic, better for structured output
        maxOutputTokens: 8192,  // Enough for the most detailed responses
      },
    })
  }

  // ─── Public Agent Methods ─────────────────────────────────────────────────

  async generateTestDesign(input: TestDesignInput): Promise<TestDesignOutput> {
    const prompt = buildTestDesignPrompt(input)
    const raw = await this._generate(prompt, 'generateTestDesign')
    return TestDesignOutputSchema.parse(raw)
  }

  async generateAutomationDraft(input: AutomationInput): Promise<AutomationOutput> {
    const prompt = buildAutomationPrompt(input)
    const raw = await this._generate(prompt, 'generateAutomationDraft')
    return AutomationOutputSchema.parse(raw)
  }

  async analyzeFailure(input: FailureAnalysisInput): Promise<FailureAnalysisOutput> {
    const prompt = buildFailureAnalysisPrompt(input)
    const raw = await this._generate(prompt, 'analyzeFailure')
    return FailureAnalysisOutputSchema.parse(raw)
  }

  async analyzeArchitecture(input: ArchitectureInput): Promise<ArchitectureOutput> {
    // Optionally load knowledge base if requested
    let knowledgeBase: string | undefined
    if (input.useKnowledgeBase) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs') as typeof import('fs')
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path') as typeof import('path')
        const kbPath = path.join(process.cwd(), 'data', 'knowledge', 'savings-architecture.json')
        if (fs.existsSync(kbPath)) {
          knowledgeBase = fs.readFileSync(kbPath, 'utf-8')
        }
      } catch { /* ignore — knowledge base is optional */ }
    }
    const prompt = buildArchitecturePrompt(input, knowledgeBase)
    const raw = await this._generate(prompt, 'analyzeArchitecture')
    return ArchitectureOutputSchema.parse(raw)
  }

  // ─── Private: call Gemini and parse JSON ──────────────────────────────────

  private async _generate(prompt: string, operation: string): Promise<unknown> {
    let text: string | undefined
    const maxAttempts = 3

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.model.generateContent(prompt)
        text = result.response.text()
        break // success — exit retry loop
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        const is503 = message.includes('503') || message.includes('Service Unavailable') || message.includes('high demand')

        // Retry on transient 503 overload errors
        if (is503 && attempt < maxAttempts) {
          await new Promise((res) => setTimeout(res, attempt * 2000))
          continue
        }

        // Surface common Gemini API errors with helpful guidance
        if (message.includes('API_KEY_INVALID') || message.includes('401')) {
          throw new Error(
            '[GeminiProvider] Invalid API key. Check GEMINI_API_KEY in .env.local.\n' +
            'Get a key at: https://aistudio.google.com/app/apikey'
          )
        }
        if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
          throw new Error(
            '[GeminiProvider] Rate limit hit. Wait a moment and try again.\n' +
            'Consider upgrading your Google AI Studio quota if this persists.'
          )
        }
        if (message.includes('404') || message.includes('MODEL_NOT_FOUND')) {
          throw new Error(
            `[GeminiProvider] Model "${process.env.GEMINI_MODEL}" not found.\n` +
            'Check GEMINI_MODEL in .env.local. Valid values: gemini-2.5-flash, gemini-1.5-pro, gemini-1.5-flash'
          )
        }
        if (is503) {
          throw new Error(
            '[GeminiProvider] Gemini is temporarily overloaded (503). ' +
            'Try again in a minute, or switch to Mock mode using the toggle in the header.'
          )
        }

        throw new Error(`[GeminiProvider] ${operation} failed: ${message}`)
      }
    }

    if (!text || text.trim() === '') {
      throw new Error(
        `[GeminiProvider] ${operation}: Gemini returned an empty response. ` +
        'This can happen if the prompt triggered a safety filter.'
      )
    }

    // Strip any accidental markdown fences (shouldn't happen with responseMimeType but defensive)
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    try {
      return JSON.parse(cleaned)
    } catch (parseErr) {
      throw new Error(
        `[GeminiProvider] ${operation}: Response is not valid JSON.\n` +
        `Parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}\n` +
        `First 600 chars of raw response:\n${text.substring(0, 600)}`
      )
    }
  }
}
