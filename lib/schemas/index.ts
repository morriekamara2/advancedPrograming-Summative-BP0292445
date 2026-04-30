/**
 * Runtime validation schemas — lib/schemas/index.ts
 *
 * This module defines all input and output validation schemas using Zod, a
 * TypeScript-first schema declaration library. Zod is chosen over plain
 * TypeScript interfaces because TypeScript types are erased at compile time
 * and therefore provide no protection against malformed data arriving at
 * runtime (e.g. from API requests, user form submissions, or AI model
 * responses that deviate from the expected contract).
 *
 * Every API route in this application parses its incoming request body
 * through the relevant InputSchema before passing it to an agent service.
 * If validation fails, Zod returns a structured list of field-level errors
 * which are surfaced directly to the client — this satisfies the error
 * handling requirement without writing bespoke validation logic.
 *
 * Data structure variety demonstrated in this file:
 *   - z.enum()        → typed string unions for agent types, statuses, priorities
 *   - z.object()      → structured records with required and optional fields
 *   - z.array()       → ordered collections of typed items
 *   - z.string().min()→ constrained scalar with length validation
 *   - z.boolean()     → primitive flag
 *   - z.record()      → open key-value map (used for audit metadata)
 *   - nested schemas  → composed from smaller reusable building blocks
 *
 * Business context: In a regulated financial services environment, strict
 * input contracts are essential. Rejecting malformed or incomplete input at
 * the API boundary prevents partial or corrupt records from entering the
 * governed approval workflow, preserving audit integrity.
 */

import { z } from 'zod'

// ─── Enums ────────────────────────────────────────────────────────────────────
// Enum schemas serve a dual purpose: they act as TypeScript literal union types
// at compile time, and enforce the same constraint at runtime on any data that
// has not been validated by the TypeScript compiler (e.g. JSON request bodies).

export const AgentTypeSchema = z.enum(['test-design', 'automation', 'failure-analysis', 'architecture'])
export const ItemStatusSchema = z.enum([
  'draft',
  'pending-approval',
  'approved',
  'rejected',
  'returned',
  'exported',
])
export const PrioritySchema = z.enum(['High', 'Medium', 'Low'])
export const ScenarioTypeSchema = z.enum([
  'happy-path',
  'edge-case',
  'negative',
  'boundary',
  'security',
  'performance',
])
export const ConfidenceLevelSchema = z.enum(['High', 'Medium', 'Low'])
export const FailureCategorySchema = z.enum([
  'real-defect',
  'flaky',
  'environment',
  'test-code',
  'data-issue',
])

// ─── Test Design ──────────────────────────────────────────────────────────────
// Input schema for the Test Design Agent. The minimum length constraints on
// storyText and acceptanceCriteria prevent the agent being invoked with
// trivially empty inputs, which would produce meaningless AI output and waste
// API quota. Optional fields (businessNotes, riskNotes) provide supplementary
// context for the prompt builder but are not required to run the agent.

export const TestDesignInputSchema = z.object({
  storyText: z.string().min(10, 'Story text must be at least 10 characters'),
  acceptanceCriteria: z.string().min(10, 'Acceptance criteria must be at least 10 characters'),
  businessNotes: z.string().optional(),
  riskNotes: z.string().optional(),
})

export const TestScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: PrioritySchema,
  type: ScenarioTypeSchema,
  tags: z.array(z.string()),
})

export const GherkinScenarioSchema = z.object({
  id: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  steps: z.string(),
})

export const TestDesignOutputSchema = z.object({
  summary: z.string(),
  scenarios: z.array(TestScenarioSchema),
  gherkinScenarios: z.array(GherkinScenarioSchema),
  edgeCases: z.array(z.string()),
  negativeCases: z.array(z.string()),
  priorityTags: z.array(z.string()),
  riskTags: z.array(z.string()),
  assumptions: z.array(z.string()),
  questions: z.array(z.string()),
})

// ─── Automation ───────────────────────────────────────────────────────────────
// Input schema for the Automation Agent. The agent takes Gherkin text (BDD
// scenarios written in natural language) and generates Playwright step
// definitions and Page Object classes. The optional fields allow engineers to
// provide additional context about their existing framework so the AI avoids
// generating duplicate or incompatible code.

export const AutomationInputSchema = z.object({
  gherkinText: z.string().min(10, 'Gherkin text must be at least 10 characters'),
  frameworkNotes: z.string().optional(),
  existingStepsContext: z.string().optional(),
  pageObjectContext: z.string().optional(),
  linkedTestDesignId: z.string().optional(),
})

export const LocatorSuggestionSchema = z.object({
  name: z.string(),
  strategy: z.enum(['data-testid', 'role', 'text', 'label', 'placeholder', 'css', 'xpath']),
  value: z.string(),
  rationale: z.string(),
})

export const StepDefinitionSchema = z.object({
  id: z.string(),
  keyword: z.string(),
  pattern: z.string(),
  implementation: z.string(),
  imports: z.array(z.string()),
})

export const PageObjectSuggestionSchema = z.object({
  name: z.string(),
  filePath: z.string(),
  locators: z.array(LocatorSuggestionSchema),
  methods: z.array(z.string()),
})

export const AutomationOutputSchema = z.object({
  stepDefinitions: z.array(StepDefinitionSchema),
  pageObjects: z.array(PageObjectSuggestionSchema),
  locators: z.array(LocatorSuggestionSchema),
  helperSuggestions: z.array(z.string()),
  implementationNotes: z.array(z.string()),
  warnings: z.array(z.string()),
  assumptions: z.array(z.string()),
  fullCode: z.string(),
})

// ─── Failure Analysis ─────────────────────────────────────────────────────────
// Input schema for the Failure Analysis Agent. The agent classifies Playwright
// test failures into categories (real-defect, flaky, environment, test-code,
// data-issue) and drafts a Jira-ready defect note. The failedLog field is
// mandatory; stackTrace and other context fields are optional but significantly
// improve the quality of the classification.

export const FailureAnalysisInputSchema = z.object({
  scenarioName: z.string().min(3, 'Scenario name required'),
  failedLog: z.string().min(10, 'Failed log must be at least 10 characters'),
  stackTrace: z.string().optional(),
  screenshotNotes: z.string().optional(),
  traceSummary: z.string().optional(),
  environmentNotes: z.string().optional(),
  linkedTestDesignId: z.string().optional(),
})

export const FailureAnalysisOutputSchema = z.object({
  summary: z.string(),
  rootCause: z.string(),
  confidenceLevel: ConfidenceLevelSchema,
  failureCategory: FailureCategorySchema,
  flakynessAssessment: z.string(),
  suggestedNextActions: z.array(z.string()),
  locatorRecommendations: z.array(LocatorSuggestionSchema),
  draftDefectNote: z.string(),
  escalationNotes: z.string(),
  relatedScenarios: z.array(z.string()),
})

// ─── Architecture & Integration ───────────────────────────────────────────────
// Input schema for the Architecture Agent. This agent answers sprint-planning
// questions about microservice integration, database selection, and downstream
// dependencies within the QE Savings Lab architecture. The useKnowledgeBase
// flag instructs the server to load the internal knowledge base JSON file
// and inject it into the prompt, allowing the model to reason over real
// architectural context rather than general best-practice knowledge.

export const ArchitectureInputSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters'),
  architectureContext: z.string().optional().default(''),
  servicesContext: z.string().optional(),
  downstreamNotes: z.string().optional(),
  modernisationNotes: z.string().optional(),
  useKnowledgeBase: z.boolean().optional(),
})

export const ArchitectureOutputSchema = z.object({
  summary: z.string(),
  answer: z.string(),
  impactedComponents: z.array(z.string()),
  integrationRisks: z.array(z.string()),
  testImplications: z.array(z.string()),
  assumptions: z.array(z.string()),
  missingInformation: z.array(z.string()),
  recommendedNextSteps: z.array(z.string()),
})

// ─── Approval ─────────────────────────────────────────────────────────────────
// Approval records form the core of the human-in-the-loop governance model.
// All AI-generated outputs are held in a draft state until a human reviewer
// explicitly approves, rejects, or returns them for revision. This ensures
// that no AI output reaches the test framework without human sign-off —
// a key requirement in regulated financial services environments.

export const ApprovalCommentSchema = z.object({
  id: z.string(),
  author: z.string(),
  text: z.string(),
  timestamp: z.string(),
})

export const ApprovalRecordSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  itemTitle: z.string(),
  agentType: AgentTypeSchema,
  status: ItemStatusSchema,
  submittedAt: z.string(),
  submittedBy: z.string(),
  reviewedAt: z.string().optional(),
  reviewedBy: z.string().optional(),
  comments: z.array(ApprovalCommentSchema),
})

// ─── Audit ────────────────────────────────────────────────────────────────────
// Every state transition (created → submitted → approved/rejected) is recorded
// as an immutable audit event. Audit events are written to separate files and
// never updated, providing a tamper-evident log for compliance purposes.
// The z.record(z.unknown()) type on the metadata field allows arbitrary
// key-value pairs to be attached to any event without requiring schema changes.

export const AuditEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  eventType: z.enum([
    'created',
    'submitted',
    'approved',
    'rejected',
    'returned',
    'edited',
    'exported',
    'linked',
    'seeded',
  ]),
  itemId: z.string(),
  itemTitle: z.string(),
  agentType: AgentTypeSchema,
  actor: z.string(),
  details: z.string(),
  metadata: z.record(z.unknown()).optional(),
})

// ─── API Request Bodies ───────────────────────────────────────────────────────

export const ApprovalActionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'return']),
  comment: z.string().optional(),
  actor: z.string().optional(),
})

export const ExportRequestSchema = z.object({
  itemId: z.string(),
  format: z.enum(['json', 'markdown']),
})
