/**
 * Prompt builder — Automation Agent
 */

import type { AutomationInput } from '@/types'

export function buildAutomationPrompt(input: AutomationInput): string {
  return `You are a senior test automation engineer specialising in Playwright with TypeScript and Cucumber BDD.

Generate a complete automation draft from the Gherkin scenarios below.

---
GHERKIN SCENARIOS
${input.gherkinText}
${input.frameworkNotes ? `\nFRAMEWORK CONVENTIONS\n${input.frameworkNotes}` : ''}
${input.existingStepsContext ? `\nEXISTING STEP DEFINITIONS (avoid duplicating these)\n${input.existingStepsContext}` : ''}
${input.pageObjectContext ? `\nEXISTING PAGE OBJECTS\n${input.pageObjectContext}` : ''}
---

Return a single JSON object that matches this exact structure. Every field is required.

{
  "stepDefinitions": [
    {
      "id": "step-001",
      "keyword": "Given",
      "pattern": "the step pattern string with {string} placeholders",
      "implementation": "TypeScript function body only (no function declaration wrapper)",
      "imports": ["ClassName from ../pages/ClassName"]
    }
  ],

  "pageObjects": [
    {
      "name": "PageClassName",
      "filePath": "src/pages/PageClassName.ts",
      "locators": [
        {
          "name": "locatorPropertyName",
          "strategy": "data-testid",
          "value": "the-testid-value",
          "rationale": "Why this locator strategy was chosen"
        }
      ],
      "methods": ["methodName(param: Type): ReturnType"]
    }
  ],

  "locators": [
    {
      "name": "descriptiveName",
      "strategy": "data-testid",
      "value": "locator-value",
      "rationale": "Why this locator strategy was chosen"
    }
  ],

  "helperSuggestions": [
    "Description of a helper function or fixture that would improve this test suite"
  ],

  "implementationNotes": [
    "Important note about the implementation that the developer must read"
  ],

  "warnings": [
    "Warning about a potential issue, duplication risk, or assumption that needs verification"
  ],

  "assumptions": [
    "Assumption made about the framework, environment, or test data"
  ],

  "fullCode": "The complete consolidated TypeScript code as a single string with all step definitions and page objects combined. Use \\n for newlines."
}

RULES:
- keyword must be exactly "Given", "When", or "Then"
- strategy must be one of: data-testid, role, text, label, placeholder, css, xpath
- Prefer data-testid > role > text > css in that order
- Use async/await throughout. All Playwright calls must be awaited.
- Use expect from @playwright/test for assertions
- fullCode must be complete, copy-pasteable TypeScript — not pseudocode
- Include all imports at the top of fullCode
- Do not wrap your response in markdown code fences
- Return only the JSON object, nothing else`
}
