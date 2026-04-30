/**
 * Unit tests — AI prompt builder functions (__tests__/prompts.test.ts)
 *
 * The prompt builders in lib/prompts/ are pure functions: they take typed
 * input and return a string. No AI model is invoked during these tests — the
 * tests exercise only the string construction logic.
 *
 * Why test prompt builders?
 *   The prompt is the primary mechanism by which user intent is communicated
 *   to the AI model. Errors here (e.g. a field not being interpolated, an
 *   optional section always appearing, or a required JSON key missing from
 *   the output contract) would cause the model to produce incorrect or
 *   unparseable responses — failures that are slow to detect because they only
 *   surface during a live API call.
 *
 *   Testing the prompt builders as pure string functions allows regressions
 *   to be caught immediately, without any network dependency.
 *
 * What is tested:
 *   - Input embedding: user-supplied values (storyText, question, failedLog)
 *     must appear verbatim in the constructed prompt so the model reasons over
 *     the actual input, not a stale placeholder.
 *
 *   - Conditional sections: optional fields (businessNotes, stackTrace,
 *     knowledgeBase) must appear in the prompt when provided and be absent
 *     when omitted — including or omitting them unconditionally would either
 *     waste context tokens or silently drop user-supplied context.
 *
 *   - Output contract: every prompt declares the JSON structure the model must
 *     return. Tests assert that all required keys are present in that
 *     declaration, ensuring the Zod output schema and the prompt stay in sync.
 *
 * Academic requirement mapping:
 *   Input/output — prompt builders are the input layer to the AI model;
 *                  the declared JSON keys are the expected output contract
 *   Testing      — demonstrates isolation of pure functions from their callers
 *   Data structures — template literal interpolation over structured TypeScript
 *                     input interfaces
 */

import { describe, it, expect } from 'vitest'
import { buildTestDesignPrompt } from '@/lib/prompts/test-design'
import { buildFailureAnalysisPrompt } from '@/lib/prompts/failure-analysis'
import { buildArchitecturePrompt } from '@/lib/prompts/architecture'

// ─── buildTestDesignPrompt ────────────────────────────────────────────────────

describe('buildTestDesignPrompt', () => {
  const baseInput = {
    storyText: 'As a customer I want to transfer funds between my accounts',
    acceptanceCriteria: 'Given I am logged in, When I submit a transfer, Then my balance updates',
  }

  it('returns a non-empty string', () => {
    const prompt = buildTestDesignPrompt(baseInput)
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('embeds the storyText in the output', () => {
    const prompt = buildTestDesignPrompt(baseInput)
    expect(prompt).toContain(baseInput.storyText)
  })

  it('embeds the acceptanceCriteria in the output', () => {
    const prompt = buildTestDesignPrompt(baseInput)
    expect(prompt).toContain(baseInput.acceptanceCriteria)
  })

  it('includes BUSINESS CONTEXT section when businessNotes is provided', () => {
    const prompt = buildTestDesignPrompt({
      ...baseInput,
      businessNotes: 'FCA regulated product',
    })
    expect(prompt).toContain('BUSINESS CONTEXT')
    expect(prompt).toContain('FCA regulated product')
  })

  it('omits BUSINESS CONTEXT section when businessNotes is absent', () => {
    const prompt = buildTestDesignPrompt(baseInput)
    expect(prompt).not.toContain('BUSINESS CONTEXT')
  })

  it('includes RISK section when riskNotes is provided', () => {
    const prompt = buildTestDesignPrompt({
      ...baseInput,
      riskNotes: 'High fraud exposure on large amounts',
    })
    expect(prompt).toContain('RISK')
    expect(prompt).toContain('High fraud exposure on large amounts')
  })

  it('declares the required JSON output keys in the prompt', () => {
    const prompt = buildTestDesignPrompt(baseInput)
    const requiredKeys = [
      '"summary"',
      '"scenarios"',
      '"gherkinScenarios"',
      '"edgeCases"',
      '"negativeCases"',
      '"priorityTags"',
      '"riskTags"',
      '"assumptions"',
      '"questions"',
    ]
    requiredKeys.forEach((key) => {
      expect(prompt).toContain(key)
    })
  })

  it('instructs the model to return only valid JSON', () => {
    const prompt = buildTestDesignPrompt(baseInput)
    expect(prompt.toLowerCase()).toContain('json')
  })
})

// ─── buildFailureAnalysisPrompt ───────────────────────────────────────────────

describe('buildFailureAnalysisPrompt', () => {
  const baseInput = {
    scenarioName: 'Fund Transfer - Happy Path',
    failedLog: 'TimeoutError: locator.click: Timeout 30000ms exceeded waiting for transfer button',
  }

  it('returns a non-empty string', () => {
    const prompt = buildFailureAnalysisPrompt(baseInput)
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('embeds the scenario name', () => {
    const prompt = buildFailureAnalysisPrompt(baseInput)
    expect(prompt).toContain(baseInput.scenarioName)
  })

  it('embeds the failed log', () => {
    const prompt = buildFailureAnalysisPrompt(baseInput)
    expect(prompt).toContain(baseInput.failedLog)
  })

  it('includes STACK TRACE section when stackTrace is provided', () => {
    const prompt = buildFailureAnalysisPrompt({
      ...baseInput,
      stackTrace: 'at Page.click (playwright/lib/page.js:123:15)',
    })
    expect(prompt).toContain('STACK TRACE')
    expect(prompt).toContain('playwright/lib/page.js')
  })

  it('omits STACK TRACE section when stackTrace is absent', () => {
    const prompt = buildFailureAnalysisPrompt(baseInput)
    expect(prompt).not.toContain('STACK TRACE')
  })

  it('includes ENVIRONMENT NOTES when provided', () => {
    const prompt = buildFailureAnalysisPrompt({
      ...baseInput,
      environmentNotes: 'Staging, Chrome 125',
    })
    expect(prompt).toContain('ENVIRONMENT NOTES')
    expect(prompt).toContain('Staging, Chrome 125')
  })

  it('declares the required JSON output keys', () => {
    const prompt = buildFailureAnalysisPrompt(baseInput)
    const requiredKeys = [
      '"summary"',
      '"rootCause"',
      '"confidenceLevel"',
      '"failureCategory"',
      '"flakynessAssessment"',
      '"suggestedNextActions"',
      '"draftDefectNote"',
      '"escalationNotes"',
    ]
    requiredKeys.forEach((key) => {
      expect(prompt).toContain(key)
    })
  })

  it('constrains confidenceLevel to High/Medium/Low in the prompt', () => {
    const prompt = buildFailureAnalysisPrompt(baseInput)
    expect(prompt).toContain('"High"')
    expect(prompt).toContain('"Medium"')
    expect(prompt).toContain('"Low"')
  })
})

// ─── buildArchitecturePrompt ──────────────────────────────────────────────────

describe('buildArchitecturePrompt', () => {
  const baseInput = {
    question: 'Which database should the payments microservice use?',
  }

  it('returns a non-empty string', () => {
    const prompt = buildArchitecturePrompt(baseInput)
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('embeds the question in the output', () => {
    const prompt = buildArchitecturePrompt(baseInput)
    expect(prompt).toContain(baseInput.question)
  })

  it('includes knowledge base section when knowledgeBase is provided', () => {
    const prompt = buildArchitecturePrompt(baseInput, 'PaymentsDB: PostgreSQL 15')
    expect(prompt).toContain('INTERNAL KNOWLEDGE BASE')
    expect(prompt).toContain('PaymentsDB: PostgreSQL 15')
  })

  it('omits internal knowledge base section when not provided', () => {
    const prompt = buildArchitecturePrompt(baseInput)
    expect(prompt).not.toContain('INTERNAL KNOWLEDGE BASE')
  })

  it('references general expertise when no knowledge base is given', () => {
    const prompt = buildArchitecturePrompt(baseInput)
    expect(prompt).toContain('ARCHITECTURAL EXPERTISE')
  })

  it('includes additional services context when servicesContext is provided', () => {
    const prompt = buildArchitecturePrompt({
      ...baseInput,
      servicesContext: 'PaymentsAPI v2 — REST, auth via OAuth2',
    })
    expect(prompt).toContain('PaymentsAPI v2')
  })

  it('declares the required JSON output keys', () => {
    const prompt = buildArchitecturePrompt(baseInput)
    const requiredKeys = [
      '"summary"',
      '"answer"',
      '"impactedComponents"',
      '"integrationRisks"',
      '"testImplications"',
      '"assumptions"',
      '"missingInformation"',
      '"recommendedNextSteps"',
    ]
    requiredKeys.forEach((key) => {
      expect(prompt).toContain(key)
    })
  })

  it('instructs the model to respond with only JSON', () => {
    const prompt = buildArchitecturePrompt(baseInput)
    expect(prompt).toContain('ONLY the JSON object')
  })
})
