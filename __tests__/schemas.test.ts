/**
 * Unit tests — Zod validation schemas (__tests__/schemas.test.ts)
 *
 * These tests verify the input validation layer that sits at the boundary
 * between HTTP requests and the agent services. Every API route calls
 * schema.safeParse(body) before passing data downstream — if this layer
 * fails, the error is returned to the client without invoking the AI model.
 *
 * Why test schemas separately?
 *   Schemas encode the application's data contract. A regression here
 *   (e.g. accidentally removing a .min() constraint) would silently allow
 *   empty inputs to reach the AI model, producing poor or meaningless output
 *   and wasting API quota. Dedicated schema tests catch these regressions
 *   immediately without requiring an end-to-end test run.
 *
 * Test structure:
 *   Each describe block covers one schema. Within each block:
 *     - A "valid input" test confirms the happy path parses successfully
 *     - Optional-field tests confirm the schema accepts both with and without
 *     - Rejection tests confirm that specific invalid values produce a
 *       safeParse failure and that the error path identifies the correct field
 *
 * Academic requirement mapping:
 *   Input/output    → schemas define and validate all agent inputs and outputs
 *   Error handling  → safeParse returns structured errors; tests assert on them
 *   Data structures → enums, objects, optional fields, arrays all tested here
 */

import { describe, it, expect } from 'vitest'
import {
  TestDesignInputSchema,
  AutomationInputSchema,
  FailureAnalysisInputSchema,
  ArchitectureInputSchema,
  AgentTypeSchema,
  ItemStatusSchema,
  ConfidenceLevelSchema,
  FailureCategorySchema,
} from '@/lib/schemas'

// ─── TestDesignInputSchema ────────────────────────────────────────────────────

describe('TestDesignInputSchema', () => {
  const validInput = {
    storyText: 'As a customer I want to transfer funds between accounts',
    acceptanceCriteria: 'Given I am logged in, When I transfer £100, Then my balance updates',
  }

  it('accepts a valid input with required fields only', () => {
    const result = TestDesignInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts a valid input with all optional fields', () => {
    const result = TestDesignInputSchema.safeParse({
      ...validInput,
      businessNotes: 'Regulated by FCA',
      riskNotes: 'High fraud risk on large transfers',
    })
    expect(result.success).toBe(true)
  })

  it('rejects storyText shorter than 10 characters', () => {
    const result = TestDesignInputSchema.safeParse({ ...validInput, storyText: 'Too short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('storyText')
    }
  })

  it('rejects acceptanceCriteria shorter than 10 characters', () => {
    const result = TestDesignInputSchema.safeParse({ ...validInput, acceptanceCriteria: 'AC1' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('acceptanceCriteria')
    }
  })

  it('rejects missing required fields', () => {
    const result = TestDesignInputSchema.safeParse({ storyText: validInput.storyText })
    expect(result.success).toBe(false)
  })
})

// ─── AutomationInputSchema ────────────────────────────────────────────────────

describe('AutomationInputSchema', () => {
  const validInput = {
    gherkinText: 'Scenario: Login\nGiven I am on the login page\nWhen I enter credentials\nThen I am logged in',
  }

  it('accepts valid input with required field only', () => {
    expect(AutomationInputSchema.safeParse(validInput).success).toBe(true)
  })

  it('accepts optional fields alongside required', () => {
    const result = AutomationInputSchema.safeParse({
      ...validInput,
      frameworkNotes: 'Use Playwright BDD',
      linkedTestDesignId: 'td_abc123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects gherkinText shorter than 10 characters', () => {
    const result = AutomationInputSchema.safeParse({ gherkinText: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('gherkinText')
    }
  })
})

// ─── FailureAnalysisInputSchema ───────────────────────────────────────────────

describe('FailureAnalysisInputSchema', () => {
  const validInput = {
    scenarioName: 'Fund Transfer - Happy Path',
    failedLog: 'TimeoutError: locator.click: Timeout 30000ms exceeded waiting for element',
  }

  it('accepts valid required fields', () => {
    expect(FailureAnalysisInputSchema.safeParse(validInput).success).toBe(true)
  })

  it('accepts all optional fields', () => {
    const result = FailureAnalysisInputSchema.safeParse({
      ...validInput,
      stackTrace: 'at Page.click (playwright/lib/page.js:123)',
      screenshotNotes: 'Button is partially visible',
      environmentNotes: 'Staging env, Chrome 125',
    })
    expect(result.success).toBe(true)
  })

  it('rejects scenarioName shorter than 3 characters', () => {
    const result = FailureAnalysisInputSchema.safeParse({ ...validInput, scenarioName: 'AB' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('scenarioName')
    }
  })

  it('rejects failedLog shorter than 10 characters', () => {
    const result = FailureAnalysisInputSchema.safeParse({ ...validInput, failedLog: 'Failed' })
    expect(result.success).toBe(false)
  })
})

// ─── ArchitectureInputSchema ──────────────────────────────────────────────────

describe('ArchitectureInputSchema', () => {
  it('accepts a valid question', () => {
    const result = ArchitectureInputSchema.safeParse({
      question: 'Which database should the payments microservice use?',
    })
    expect(result.success).toBe(true)
  })

  it('defaults architectureContext to empty string when omitted', () => {
    const result = ArchitectureInputSchema.safeParse({
      question: 'Which database should the payments microservice use?',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.architectureContext).toBe('')
    }
  })

  it('rejects question shorter than 5 characters', () => {
    const result = ArchitectureInputSchema.safeParse({ question: 'Why?' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('question')
    }
  })

  it('accepts useKnowledgeBase boolean flag', () => {
    const result = ArchitectureInputSchema.safeParse({
      question: 'What are the downstream dependencies of the savings API?',
      useKnowledgeBase: true,
    })
    expect(result.success).toBe(true)
  })
})

// ─── Enum Schemas ─────────────────────────────────────────────────────────────

describe('AgentTypeSchema', () => {
  const valid = ['test-design', 'automation', 'failure-analysis', 'architecture']
  valid.forEach((v) => {
    it(`accepts "${v}"`, () => {
      expect(AgentTypeSchema.safeParse(v).success).toBe(true)
    })
  })

  it('rejects unknown agent type', () => {
    expect(AgentTypeSchema.safeParse('unknown-agent').success).toBe(false)
  })
})

describe('ItemStatusSchema', () => {
  const valid = ['draft', 'pending-approval', 'approved', 'rejected', 'returned', 'exported']
  valid.forEach((v) => {
    it(`accepts "${v}"`, () => {
      expect(ItemStatusSchema.safeParse(v).success).toBe(true)
    })
  })
})

describe('ConfidenceLevelSchema', () => {
  it('accepts High, Medium, Low', () => {
    expect(ConfidenceLevelSchema.safeParse('High').success).toBe(true)
    expect(ConfidenceLevelSchema.safeParse('Medium').success).toBe(true)
    expect(ConfidenceLevelSchema.safeParse('Low').success).toBe(true)
  })

  it('rejects lowercase "high"', () => {
    expect(ConfidenceLevelSchema.safeParse('high').success).toBe(false)
  })
})

describe('FailureCategorySchema', () => {
  const valid = ['real-defect', 'flaky', 'environment', 'test-code', 'data-issue']
  valid.forEach((v) => {
    it(`accepts "${v}"`, () => {
      expect(FailureCategorySchema.safeParse(v).success).toBe(true)
    })
  })

  it('rejects unknown category', () => {
    expect(FailureCategorySchema.safeParse('unknown').success).toBe(false)
  })
})
