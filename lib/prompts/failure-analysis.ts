/**
 * Prompt builder — Failure Analysis Agent (lib/prompts/failure-analysis.ts)
 *
 * Constructs the prompt used to classify a Playwright test failure and produce
 * a structured triage report. This agent addresses a common pain point in
 * enterprise QE: engineers spend significant time manually triaging failures
 * to distinguish real defects from test code issues, environment instability,
 * or flaky timing problems. The AI accelerates this triage while keeping a
 * human reviewer in the loop before any Jira defect is raised.
 *
 * Design decisions:
 *
 *   Constrained enum output — The prompt explicitly restricts confidenceLevel
 *   to "High" | "Medium" | "Low" and failureCategory to a fixed five-value
 *   set. This mirrors the FailureCategorySchema and ConfidenceLevelSchema Zod
 *   enums, so the API response can be validated without post-processing.
 *
 *   Optional context escalation — stackTrace, screenshotNotes, traceSummary,
 *   and environmentNotes are all conditionally interpolated. Richer context
 *   produces more accurate classification; the agent degrades gracefully when
 *   only the basic failedLog is provided.
 *
 *   Jira-ready output — The draftDefectNote field is explicitly formatted as
 *   a markdown Jira ticket body, ready for direct copy-paste or API submission
 *   via the /api/jira-create endpoint. This removes a manual formatting step
 *   from the engineer's workflow.
 *
 * Called by: lib/services/agents/failure-analysis.ts → runFailureAnalysisAgent()
 */

import type { FailureAnalysisInput } from '@/types'

export function buildFailureAnalysisPrompt(input: FailureAnalysisInput): string {
  return `You are a senior QE engineer and test failure analyst at a UK financial services company.

Analyse the following Playwright test failure and produce a structured triage report.

---
SCENARIO NAME
${input.scenarioName}

FAILED LOG
${input.failedLog}
${input.stackTrace ? `\nSTACK TRACE\n${input.stackTrace}` : ''}
${input.screenshotNotes ? `\nSCREENSHOT NOTES\n${input.screenshotNotes}` : ''}
${input.traceSummary ? `\nTRACE SUMMARY\n${input.traceSummary}` : ''}
${input.environmentNotes ? `\nENVIRONMENT NOTES\n${input.environmentNotes}` : ''}
---

Return a single JSON object that matches this exact structure. Every field is required.

{
  "summary": "2-3 sentences: what failed, at what step, and what the likely cause is",

  "rootCause": "Detailed paragraph explaining the root cause. Be specific about whether this is a product change, a test code issue, or an environment problem.",

  "confidenceLevel": "High",

  "failureCategory": "real-defect",

  "flakynessAssessment": "Paragraph assessing whether this failure is likely flaky (intermittent) or deterministic. Include the reasoning.",

  "suggestedNextActions": [
    "Specific, actionable next step"
  ],

  "locatorRecommendations": [
    {
      "name": "descriptiveName",
      "strategy": "data-testid",
      "value": "recommended-locator-value",
      "rationale": "Why this locator would be more stable"
    }
  ],

  "draftDefectNote": "A complete defect note in markdown format, ready to paste into Jira. Must include: Summary, Steps to Reproduce, Expected, Actual, Environment, Confidence, Classification.",

  "escalationNotes": "Guidance on whether and how to escalate this failure, and to which team.",

  "relatedScenarios": [
    "Name of a related scenario that might also be affected"
  ]
}

RULES:
- confidenceLevel must be exactly "High", "Medium", or "Low"
- failureCategory must be exactly one of: real-defect, flaky, environment, test-code, data-issue
- locatorRecommendations can be an empty array [] if the failure is not locator-related
- strategy must be one of: data-testid, role, text, label, placeholder, css, xpath
- draftDefectNote must be a complete, professional defect description — not a placeholder
- Do not wrap your response in markdown code fences
- Return only the JSON object, nothing else`
}
