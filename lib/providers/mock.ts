/**
 * Mock AI Provider — lib/providers/mock.ts
 *
 * Implements the AIProvider interface with deterministic, seeded responses
 * rather than live model calls. This serves two purposes:
 *
 *   1. Demo mode — the application can be presented and evaluated without
 *      an active Gemini API key or network connection.
 *
 *   2. Testing — unit and integration tests can assert against predictable
 *      output without incurring latency or API costs.
 *
 * The mock outputs are not random placeholders — they are domain-realistic
 * examples drawn from a UK retail banking context (fund transfers, ISA
 * accounts, Playwright BDD automation, microservice architecture). This
 * ensures the demo is credible to a QE or engineering audience.
 *
 * Dynamic behaviour — each method performs lightweight keyword detection on
 * the input (e.g. /transfer|payment/i, /timeout/i) and adjusts its output
 * accordingly. This makes the mock appear responsive to input without
 * requiring a live model, and exercises the same output data structures that
 * the real provider would return.
 *
 * Artificial delays (1.2–1.8 s) are applied via a local delay() helper to
 * simulate realistic model response times — preventing the UI from appearing
 * instantaneous in a way that would mislead stakeholders about production
 * latency characteristics.
 *
 * Provider selection is controlled by the AI_PROVIDER environment variable
 * or a runtime override in data/settings/provider.json. Switching from mock
 * to a live provider requires no code changes — only a configuration update.
 */

import { generateId } from '@/lib/utils'
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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class MockProvider implements AIProvider {
  async generateTestDesign(input: TestDesignInput): Promise<TestDesignOutput> {
    await delay(1400) // simulate model response time

    // Parse key concepts from the input for a slightly dynamic output
    const storySnippet = input.storyText.substring(0, 60)
    const hasTransfer = /transfer|payment|send/i.test(input.storyText)
    const hasSavings = /saving|deposit|account/i.test(input.storyText)
    const domain = hasTransfer ? 'payment transfer' : hasSavings ? 'savings account' : 'feature'

    return {
      summary: `Test coverage analysis for: "${storySnippet}…"\n\nThis story covers the ${domain} flow. The following scenarios ensure functional correctness, boundary validation, security constraints, and negative path handling. 6 test scenarios generated across 3 priority tiers with ${hasSavings ? '2 high-risk edge cases relating to balance limits' : '3 edge cases relating to validation and security'}.`,

      scenarios: [
        {
          id: generateId('scn'),
          title: `Successful ${domain} — happy path`,
          description: `A registered customer with sufficient funds completes a valid ${domain} end-to-end and receives a confirmation reference.`,
          priority: 'High',
          type: 'happy-path',
          tags: ['@regression', '@smoke', '@priority-high'],
        },
        {
          id: generateId('scn'),
          title: `${domain} — insufficient funds`,
          description: `Customer attempts a ${domain} that exceeds their available balance. System should display a clear error and not process the transaction.`,
          priority: 'High',
          type: 'negative',
          tags: ['@regression', '@priority-high', '@negative'],
        },
        {
          id: generateId('scn'),
          title: `${domain} — boundary: minimum amount`,
          description: `Customer initiates a ${domain} for exactly the minimum permitted amount (£0.01). Transaction should be accepted.`,
          priority: 'Medium',
          type: 'boundary',
          tags: ['@regression', '@boundary'],
        },
        {
          id: generateId('scn'),
          title: `${domain} — boundary: maximum daily limit`,
          description: `Customer initiates a ${domain} that equals the maximum daily limit. Should succeed. Any amount above should be blocked.`,
          priority: 'High',
          type: 'boundary',
          tags: ['@regression', '@boundary', '@priority-high'],
        },
        {
          id: generateId('scn'),
          title: `${domain} — invalid reference / special characters`,
          description: `Customer enters a payment reference containing SQL injection characters or script tags. System must sanitise input and display a validation error.`,
          priority: 'Medium',
          type: 'security',
          tags: ['@security', '@regression'],
        },
        {
          id: generateId('scn'),
          title: `${domain} — session timeout mid-flow`,
          description: `Customer's session expires while completing the ${domain} form. System should redirect to login without processing a partial transaction.`,
          priority: 'Medium',
          type: 'edge-case',
          tags: ['@edge-case', '@regression'],
        },
      ],

      gherkinScenarios: [
        {
          id: generateId('gkn'),
          title: `Successful ${domain}`,
          tags: ['@regression', '@smoke', '@priority-high'],
          steps: `@regression @smoke @priority-high
Feature: ${domain.charAt(0).toUpperCase() + domain.slice(1)}

  Scenario: Successful ${domain} — happy path
    Given I am logged in as a registered customer with sufficient funds
    And I navigate to the "${domain}" page
    When I enter a valid amount of "£100.00"
    And I enter a valid reference "Invoice-2024-001"
    And I confirm the ${domain}
    Then I should see a success confirmation message
    And I should receive a transaction reference number
    And my account balance should be reduced by £100.00`,
        },
        {
          id: generateId('gkn'),
          title: `${domain} — insufficient funds`,
          tags: ['@regression', '@negative', '@priority-high'],
          steps: `@regression @negative @priority-high
  Scenario: ${domain} — insufficient funds
    Given I am logged in as a registered customer with a balance of "£50.00"
    And I navigate to the "${domain}" page
    When I enter an amount of "£200.00"
    And I attempt to confirm the ${domain}
    Then I should see an error message "Insufficient funds"
    And no transaction should be created
    And my account balance should remain "£50.00"`,
        },
        {
          id: generateId('gkn'),
          title: `${domain} — maximum daily limit exceeded`,
          tags: ['@regression', '@boundary', '@priority-high'],
          steps: `@regression @boundary @priority-high
  Scenario: ${domain} exceeds daily limit
    Given I am logged in as a registered customer
    And my daily ${domain} limit is "£10,000.00"
    And I have already transferred "£9,500.00" today
    When I attempt to transfer "£600.00"
    Then I should see a warning "Daily limit exceeded"
    And the transaction should not be processed`,
        },
      ],

      edgeCases: [
        `Customer with joint account — both holders must confirm transfers above £1,000`,
        `Network timeout between submission and bank processing — idempotency key must prevent duplicate transactions`,
        `Customer switches browser tab or navigates back during 3DS authentication`,
        `Amount entered with leading zeros (e.g. "007.50") — should normalise to "7.50"`,
        `Concurrent ${domain} requests from the same session (double-click on submit)`,
        `Payee account closed or frozen at time of processing`,
      ],

      negativeCases: [
        `Amount field left blank — validation error shown inline`,
        `Amount entered as text (e.g. "ten pounds") — numeric validation rejects input`,
        `Reference field exceeds maximum character limit (18 chars for BACS)`,
        `Customer not enrolled for ${domain} — feature should not be accessible`,
        `Invalid destination sort code format — real-time validation`,
        `Amount contains currency symbol in field (e.g. "£100") — should strip or reject`,
      ],

      priorityTags: ['@priority-high', '@priority-medium', '@priority-low'],
      riskTags: [
        '@risk-financial',
        '@risk-security',
        '@risk-data-integrity',
        '@risk-session-management',
      ],

      assumptions: [
        `Customer authentication and session management is handled by a separate auth service and is not retested here`,
        `The maximum daily transfer limit is £10,000 based on current product specification`,
        `BACS payment references follow 18-character alphanumeric format`,
        `Balance updates are synchronous from the customer's perspective for display purposes`,
      ],

      questions: [
        `What is the exact validation rule for the payment reference field? (Length, allowed characters)`,
        `Does the app support scheduled/future-dated transfers? If so, add scenarios.`,
        `Is there a retry mechanism if the downstream payment service returns a 5xx error?`,
        `Should negative amounts be blocked at the UI level or only at the API level?`,
        `Are there any regulatory holds that can block a transfer mid-flow?`,
      ],
    }
  }

  async generateAutomationDraft(input: AutomationInput): Promise<AutomationOutput> {
    await delay(1600)

    const scenarioHint = input.gherkinText.substring(0, 80)
    const hasLogin = /log.*in|sign.*in|authenticated/i.test(input.gherkinText)
    const hasForm = /enter|fill|type|input/i.test(input.gherkinText)
    const hasNavigation = /navigate|go to|visit/i.test(input.gherkinText)

    const fullCode = `// ─── Step Definitions ────────────────────────────────────────────────────────
// Auto-generated draft — review before committing to framework
// Scenario context: ${scenarioHint}

import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TransferPage } from '../pages/TransferPage'
import { LoginPage } from '../pages/LoginPage'
import { AccountPage } from '../pages/AccountPage'
import type { ICustomWorld } from '../support/world'

${
  hasLogin
    ? `Given('I am logged in as a registered customer with sufficient funds', async function (this: ICustomWorld) {
  const loginPage = new LoginPage(this.page)
  await loginPage.navigate()
  await loginPage.login(this.testData.username, this.testData.password)
  await expect(this.page).toHaveURL(/dashboard/)
})

`
    : ''
}${
      hasNavigation
        ? `Given('I navigate to the {string} page', async function (this: ICustomWorld, pageName: string) {
  const transferPage = new TransferPage(this.page)
  await transferPage.navigate()
  await expect(this.page.getByRole('heading', { name: pageName })).toBeVisible()
})

`
        : ''
    }${
      hasForm
        ? `When('I enter a valid amount of {string}', async function (this: ICustomWorld, amount: string) {
  const transferPage = new TransferPage(this.page)
  await transferPage.enterAmount(amount)
})

When('I enter a valid reference {string}', async function (this: ICustomWorld, reference: string) {
  const transferPage = new TransferPage(this.page)
  await transferPage.enterReference(reference)
})

When('I confirm the transfer', async function (this: ICustomWorld) {
  const transferPage = new TransferPage(this.page)
  await transferPage.confirmTransfer()
})

`
        : ''
    }Then('I should see a success confirmation message', async function (this: ICustomWorld) {
  await expect(this.page.getByRole('alert', { name: /success/i })).toBeVisible({ timeout: 10_000 })
})

Then('I should receive a transaction reference number', async function (this: ICustomWorld) {
  const refLocator = this.page.getByTestId('transaction-reference')
  await expect(refLocator).toBeVisible()
  const refText = await refLocator.textContent()
  expect(refText).toMatch(/^[A-Z0-9]{8,}$/)
})

Then('my account balance should be reduced by {string}', async function (this: ICustomWorld, amount: string) {
  const accountPage = new AccountPage(this.page)
  const balance = await accountPage.getBalance()
  // TODO: compare against pre-test balance stored in world context
  expect(balance).toBeDefined()
})

// ─── Page Object: TransferPage ────────────────────────────────────────────────

// FILE: src/pages/TransferPage.ts
import { Page, Locator } from '@playwright/test'

export class TransferPage {
  readonly page: Page
  readonly amountInput: Locator
  readonly referenceInput: Locator
  readonly confirmButton: Locator
  readonly errorMessage: Locator
  readonly successAlert: Locator
  readonly transactionReference: Locator

  constructor(page: Page) {
    this.page = page
    this.amountInput = page.getByTestId('transfer-amount-input')
    this.referenceInput = page.getByTestId('transfer-reference-input')
    this.confirmButton = page.getByRole('button', { name: /confirm transfer/i })
    this.errorMessage = page.getByRole('alert', { name: /error/i })
    this.successAlert = page.getByRole('alert', { name: /success/i })
    this.transactionReference = page.getByTestId('transaction-reference')
  }

  async navigate() {
    await this.page.goto('/transfers/new')
  }

  async enterAmount(amount: string) {
    // Strip currency symbol before entering — the field expects numeric only
    const numericAmount = amount.replace(/[£$€,]/g, '').trim()
    await this.amountInput.fill(numericAmount)
  }

  async enterReference(reference: string) {
    await this.referenceInput.fill(reference)
  }

  async confirmTransfer() {
    await this.confirmButton.click()
  }
}`

    return {
      stepDefinitions: [
        {
          id: generateId('step'),
          keyword: 'Given',
          pattern: 'I am logged in as a registered customer with sufficient funds',
          implementation: `const loginPage = new LoginPage(this.page)\nawait loginPage.navigate()\nawait loginPage.login(this.testData.username, this.testData.password)`,
          imports: ['LoginPage from ../pages/LoginPage', 'ICustomWorld from ../support/world'],
        },
        {
          id: generateId('step'),
          keyword: 'When',
          pattern: 'I enter a valid amount of {string}',
          implementation: `const transferPage = new TransferPage(this.page)\nawait transferPage.enterAmount(amount)`,
          imports: ['TransferPage from ../pages/TransferPage'],
        },
        {
          id: generateId('step'),
          keyword: 'When',
          pattern: 'I confirm the transfer',
          implementation: `const transferPage = new TransferPage(this.page)\nawait transferPage.confirmTransfer()`,
          imports: ['TransferPage from ../pages/TransferPage'],
        },
        {
          id: generateId('step'),
          keyword: 'Then',
          pattern: 'I should see a success confirmation message',
          implementation: `await expect(this.page.getByRole('alert', { name: /success/i })).toBeVisible({ timeout: 10_000 })`,
          imports: ['expect from @playwright/test'],
        },
      ],

      pageObjects: [
        {
          name: 'TransferPage',
          filePath: 'src/pages/TransferPage.ts',
          locators: [
            {
              name: 'amountInput',
              strategy: 'data-testid',
              value: 'transfer-amount-input',
              rationale: 'Stable test ID preferred over CSS selector for form inputs',
            },
            {
              name: 'referenceInput',
              strategy: 'data-testid',
              value: 'transfer-reference-input',
              rationale: 'Stable test ID preferred over CSS selector for form inputs',
            },
            {
              name: 'confirmButton',
              strategy: 'role',
              value: "button, { name: /confirm transfer/i }",
              rationale: 'Role-based locator is resilient to style changes',
            },
            {
              name: 'successAlert',
              strategy: 'role',
              value: "alert, { name: /success/i }",
              rationale: 'ARIA role ensures accessibility compliance also tested',
            },
          ],
          methods: ['navigate()', 'enterAmount(amount)', 'enterReference(reference)', 'confirmTransfer()', 'getSuccessReference()'],
        },
      ],

      locators: [
        {
          name: 'transfer-amount-input',
          strategy: 'data-testid',
          value: 'transfer-amount-input',
          rationale: 'Request dev team add data-testid="transfer-amount-input" to the amount field',
        },
        {
          name: 'confirmButton',
          strategy: 'role',
          value: "button[name='Confirm Transfer']",
          rationale: 'Use ARIA role so the test also validates accessibility labelling',
        },
        {
          name: 'transactionReference',
          strategy: 'data-testid',
          value: 'transaction-reference',
          rationale: 'Required for assertion on the confirmation reference number',
        },
      ],

      helperSuggestions: [
        `Create a \`generateTestAmount()\` helper that returns a random valid amount between £1–£999 to improve test independence`,
        `Add a \`clearTransactionHistory()\` fixture to run before each transfer test to avoid daily limit accumulation`,
        `Consider a \`TestDataFactory\` class for generating and cleaning up test accounts/payees`,
      ],

      implementationNotes: [
        `The \`enterAmount\` method strips currency symbols before filling — confirm with the dev team whether the input accepts formatted or raw numeric values`,
        `Step definitions use a \`ICustomWorld\` interface — ensure this matches your Cucumber world setup`,
        `The \`confirmTransfer\` step clicks a button found by role — if the button text changes, update the regex pattern`,
        `Timeout on the success assertion is set to 10 seconds to allow for async transaction processing`,
      ],

      warnings: [
        `No existing step definitions context was provided — some generated steps may duplicate patterns already in your framework. Check for conflicts before adding.`,
        `Balance assertion is incomplete (marked TODO) — the pre-test balance needs to be captured in a Before hook and stored in world context`,
        `The page URL \`/transfers/new\` is assumed — verify against your routing configuration`,
      ],

      assumptions: [
        `Framework uses @cucumber/cucumber with Playwright world integration`,
        `TypeScript strict mode is enabled`,
        `Page objects follow the constructor-locator pattern already in use`,
        `Test data (username/password) is injected via the ICustomWorld context`,
      ],

      fullCode,
    }
  }

  async analyzeFailure(input: FailureAnalysisInput): Promise<FailureAnalysisOutput> {
    await delay(1200)

    const isLocatorError =
      /locator|selector|element not found|strict mode violation/i.test(input.failedLog) ||
      /locator|selector|element not found/i.test(input.stackTrace ?? '')
    const isTimeoutError =
      /timeout|timed out|waiting for/i.test(input.failedLog) ||
      /timeout/i.test(input.stackTrace ?? '')
    const isNetworkError = /network|ERR_CONNECTION|fetch|api|502|503|504/i.test(input.failedLog)
    const isAssertionError = /expect|assertion|toBe|toHave/i.test(input.stackTrace ?? '')

    let failureCategory: FailureAnalysisOutput['failureCategory'] = 'test-code'
    let rootCause = ''
    let confidence: FailureAnalysisOutput['confidenceLevel'] = 'Medium'
    let flakynessAssessment = ''

    if (isLocatorError) {
      failureCategory = 'test-code'
      rootCause = `The test failed due to a locator resolution error. The target element could not be found in the DOM at the time of interaction. This is commonly caused by: (1) a UI change that renamed or removed a data-testid, (2) the element being inside a shadow DOM not handled in the selector, or (3) the element not yet rendered when the locator was evaluated.`
      confidence = 'High'
      flakynessAssessment = `This failure pattern is NOT typically flaky — it fails consistently when a locator breaks. Classify as a test maintenance issue. Verify whether the DOM structure changed in a recent deployment.`
    } else if (isTimeoutError) {
      failureCategory = 'flaky'
      rootCause = `The test timed out waiting for an element or network response. This is a candidate for flakiness — especially if the failure does not reproduce consistently. Root cause may be: (1) a slow environment or CI resource contention, (2) a missing \`await\` causing a race condition, or (3) an animation/transition that delays element visibility.`
      confidence = 'Medium'
      flakynessAssessment = `Timeout failures have a high flakiness probability (est. 60–70% in CI environments). Before raising a defect, re-run in isolation. If it passes on retry, this is almost certainly environmental or a timing issue in the test rather than a product defect.`
    } else if (isNetworkError) {
      failureCategory = 'environment'
      rootCause = `The failure appears to be caused by a network or environment issue. The test could not reach a required backend service. This is unlikely to be a product defect — it is more likely an unstable test environment, a service that was not running, or a firewall/proxy issue in the CI pipeline.`
      confidence = 'High'
      flakynessAssessment = `Environment failures are not product defects. Do not raise a Jira defect. Investigate environment stability, service health dashboards, and network routing in CI.`
    } else if (isAssertionError) {
      failureCategory = 'real-defect'
      rootCause = `The test reached the assertion stage but the expected value did not match the actual value. This is a strong indicator of a real product defect — the feature is behaving differently from the expected specification. The assertion failure message in the stack trace will pinpoint the divergence.`
      confidence = 'High'
      flakynessAssessment = `Assertion failures after successful navigation and interaction are very unlikely to be flaky. This should be treated as a confirmed defect until proven otherwise.`
    } else {
      failureCategory = 'real-defect'
      rootCause = `Based on the provided log, the failure could not be classified with high confidence into a specific category. Manual investigation recommended. Key signals to look for: error message text, HTTP status codes in network logs, recent deployments, and whether the failure is consistent across reruns.`
      confidence = 'Low'
      flakynessAssessment = `Insufficient data to assess flakiness. Recommend re-running the scenario 3 times in isolation before drawing conclusions.`
    }

    return {
      summary: `Failure analysis for scenario: "${input.scenarioName}"\n\nThe test failed with a ${isLocatorError ? 'locator' : isTimeoutError ? 'timeout' : isNetworkError ? 'network' : 'assertion'} error. Confidence in classification: ${confidence}. Category: ${failureCategory.replace('-', ' ')}. ${isNetworkError ? 'This does not appear to be a product defect.' : isLocatorError ? 'This is a test maintenance issue, not a product defect.' : 'This may indicate a genuine product defect requiring investigation.'}`,

      rootCause,
      confidenceLevel: confidence,
      failureCategory,
      flakynessAssessment,

      suggestedNextActions: [
        isLocatorError
          ? `Inspect the DOM for the scenario at the point of failure — check if the target element's data-testid or aria attributes have changed`
          : `Re-run the failing scenario 3 times in isolation to determine consistency`,
        `Review recent deployments or PRs merged since the last green run`,
        isTimeoutError
          ? `Increase the timeout on this specific step as a temporary measure and add a GitHub issue to track the underlying cause`
          : `Raise a Jira defect ticket if the failure reproduces consistently`,
        `Check the Playwright trace viewer for the failing run (if available)`,
        isNetworkError
          ? `Verify environment health: check service logs, container status, and network policies in CI`
          : `Add this scenario to the regression watchlist for the next sprint`,
      ].filter(Boolean) as string[],

      locatorRecommendations: isLocatorError
        ? [
            {
              name: 'Preferred locator strategy',
              strategy: 'data-testid',
              value: 'element-name-here',
              rationale:
                'Replace brittle CSS class selectors with data-testid attributes. Request the dev team to add stable test IDs to all interactive elements.',
            },
            {
              name: 'Fallback: ARIA role',
              strategy: 'role',
              value: "button, { name: 'Submit' }",
              rationale:
                'Role-based locators are resilient to cosmetic changes and also validate accessibility compliance.',
            },
          ]
        : [],

      draftDefectNote: `**Defect Draft — ${input.scenarioName}**

**Summary:** ${input.scenarioName} — ${isLocatorError ? 'Test Maintenance: Locator broken after UI change' : isTimeoutError ? 'Intermittent timeout failure in CI' : isNetworkError ? 'Environment issue — not a product defect' : 'Assertion failure — behaviour diverges from specification'}

**Steps to reproduce:**
1. Run scenario: "${input.scenarioName}"
2. Observe failure at step: [identify from stack trace]

**Expected:** Test passes and assertion holds

**Actual:** ${isLocatorError ? 'Element not found — locator resolution failed' : isTimeoutError ? 'Timeout waiting for element or response' : isNetworkError ? 'Network error — could not reach backend service' : 'Assertion failed — actual value does not match expected'}

**Environment:** ${input.environmentNotes ?? 'Not specified'}

**Confidence:** ${confidence}
**Classification:** ${failureCategory.replace('-', ' ')}
**Flakiness risk:** ${isTimeoutError ? 'High' : isLocatorError ? 'Low' : 'Medium'}

**Attachments:** [Add Playwright trace, screenshot, and log file]`,

      escalationNotes:
        failureCategory === 'real-defect'
          ? `Escalate to development team if defect reproduces in 2+ consecutive runs. Mark as regression if this scenario was previously passing. Include trace file and screenshot as evidence.`
          : failureCategory === 'environment'
            ? `Escalate to platform/DevOps team. Do not raise as a product defect. Log in the infrastructure runbook and monitor for recurrence.`
            : `No immediate escalation required. Monitor over next 5 runs. If failure persists, escalate to QE lead for test maintenance prioritisation.`,

      relatedScenarios: [
        `${input.scenarioName} — happy path variant`,
        `${input.scenarioName} — negative path variant`,
        'Session management — timeout scenarios',
        'Navigation — page load scenarios',
      ],
    }
  }

  async analyzeArchitecture(input: ArchitectureInput): Promise<ArchitectureOutput> {
    await delay(1800)

    const q = input.question.toLowerCase()
    const isPayments   = /payment|fps|transfer|withdraw|deposit/i.test(q + input.architectureContext)
    const isIdentity   = /kyc|identity|verif|onfido|aml|onboard/i.test(q + input.architectureContext)
    const isISA        = /isa|allowance|hmrc|tax/i.test(q + input.architectureContext)
    const isMigration  = /migrat|modern|legacy|uplift|replatform/i.test(q + input.architectureContext)

    const domain = isPayments ? 'payments' : isIdentity ? 'identity verification' : isISA ? 'ISA management' : 'savings account'

    return {
      summary: `Analysis of the ${domain} integration within the QE Savings Lab architecture. The question touches on ${isPayments ? 'the Payment Processing Service and its FPS integration' : isIdentity ? 'the Identity & Verification Service and its Onfido dependency' : 'the Savings Account Service and its downstream integrations'}. Key findings relate to integration risk at service boundaries and test coverage gaps in asynchronous event flows.`,

      answer: `Based on the provided architecture context, the ${domain} flow involves multiple service boundaries that introduce both latency and consistency challenges.\n\n${isPayments
        ? 'The Payment Processing Service (PPS) is the authoritative handler for all deposit and withdrawal operations. It integrates synchronously with the FPS gateway for Faster Payments and asynchronously with the Core Banking Ledger via IBM MQ. A critical architectural consideration is that the Core Banking Ledger operates on 15-minute batch cycles — meaning real-time balance views shown to customers may lag behind the authoritative ledger state. This creates a window during which duplicate payment attempts could appear valid to the UI layer while the ledger is still processing the prior transaction.\n\nThe idempotency key mechanism in PPS is the primary defence against duplicate submissions, but the known issue SAS-441 indicates this protection has a 30-second blind spot. Any testing strategy must specifically target this window.\n\nDownstream, payment events are published to the savings.payments Kafka topic, consumed by SAS, NS, and CBL. A failure in any consumer does not block payment settlement — but may result in missing account balance updates or undelivered notifications, which are customer-visible failures.'
        : isIdentity
        ? 'The Identity & Verification Service (IVS) acts as the gatekeeper for all new account openings. It integrates with Onfido for document and biometric verification, and screens against the Compliance Sanctions List on a daily-sync basis. This daily sync creates a risk window: a customer screened between sync cycles could be accepted based on a stale list.\n\nVerification results are communicated via webhook from Onfido, which is not guaranteed delivery. A missed webhook leaves the verification session in a pending state indefinitely. The IVS must implement webhook retry reconciliation or a polling fallback — it is unclear from the context whether this exists.\n\nThe IVS publishes VerificationPassed and VerificationFailed events to the identity.verification Kafka topic, consumed by SAS and CPS. If SAS does not receive the VerificationPassed event — due to a consumer lag or partition failure — the account cannot transition from pending to active state, even if the customer has passed identity checks.'
        : isMigration
        ? 'The modernisation context indicates that the Core Banking Ledger (CBL) is a COBOL-based legacy system integrated via IBM MQ and a REST adapter. Any modernisation effort involving CBL carries significant risk due to: (1) the lack of a production-equivalent sandbox environment, (2) the 100 TPS sustained throughput limit, and (3) the nightly maintenance window (02:00–03:00 UTC) during which CBL is unavailable.\n\nMicroservices that currently publish to CBL via Kafka (SAS, PPS) would need careful migration sequencing to avoid dual-write consistency issues. A strangler fig pattern is recommended — routing specific event types to the new system while legacy events continue to CBL — but this requires robust event replay capability for cutover.\n\nFrom a testing perspective, the absence of a CBL sandbox means integration tests for the legacy path must run against staging, which limits test frequency and data isolation.'
        : 'The Savings Account Service (SAS) is the orchestrating service for account lifecycle. It consumes identity verification events from IVS, payment events from PPS, and publishes account events to CBL and NS. The multi-service nature of account opening — spanning IVS, SAS, PPS, and CBL — means there are four distributed failure points between a customer submitting an application and receiving confirmation.\n\nThe event-driven integration via Kafka is appropriate for resilience, but introduces eventual consistency: the customer may receive an account confirmation email (via NS) before the CBL has processed the AccountOpened event. If CBL processing subsequently fails, the account may appear active to the customer but not be reflected in regulatory reporting.\n\nISA accounts have an additional constraint: the annual allowance check (£20,000) is only enforced at account open, not on subsequent top-ups. This is a known gap that requires specific test coverage to ensure the top-up flow correctly reads the current subscription total before allowing a deposit.'
      }`,

      impactedComponents: isPayments
        ? ['Payment Processing Service (PPS)', 'Core Banking Ledger (CBL)', 'Savings Account Service (SAS)', 'Notification Service (NS)', 'Faster Payments Scheme (FPS)', 'Kafka topic: savings.payments']
        : isIdentity
        ? ['Identity & Verification Service (IVS)', 'Savings Account Service (SAS)', 'Customer Profile Service (CPS)', 'Onfido (KYC)', 'Kafka topic: identity.verification', 'Compliance Sanctions List']
        : ['Savings Account Service (SAS)', 'Core Banking Ledger (CBL)', 'Payment Processing Service (PPS)', 'Identity & Verification Service (IVS)', 'Notification Service (NS)', 'API Gateway'],

      integrationRisks: [
        isPayments
          ? 'Idempotency key blind spot (30 seconds) in PPS — SAS-441 — allows duplicate payment creation'
          : 'Eventual consistency between SAS account state and CBL authoritative balance during 15-minute batch windows',
        isIdentity
          ? 'Onfido webhook delivery is not guaranteed — missed callbacks can permanently strand verification sessions in pending state'
          : 'ISA allowance validation is point-in-time at account open only — subsequent top-ups bypass the £20,000 annual limit check',
        'Core Banking Ledger maintenance window (02:00–03:00 UTC) — no transactions processed; downstream consumers must handle CBL unavailability',
        'Kafka consumer lag on high-traffic days could delay AccountOpened events reaching CBL, causing regulatory reporting gaps',
        isMigration
          ? 'No CBL sandbox environment — modernisation integration tests must run against shared staging, increasing risk of environment pollution'
          : 'API Gateway rate limiting (100 req/min per customer) could throttle burst traffic during peak onboarding periods',
      ],

      testImplications: [
        'End-to-end integration tests must cover the asynchronous event chain — do not test services in isolation for flows that span multiple Kafka topics',
        isPayments
          ? 'Dedicated test cases required for the SAS-441 duplicate payment window — send concurrent requests within 30 seconds and verify only one transaction is created'
          : 'Test the top-up flow with a customer who has already used £19,900 of their ISA allowance — verify the £100 remaining limit is correctly enforced',
        isIdentity
          ? 'Simulate Onfido webhook non-delivery in integration tests — verify the IVS reconciliation mechanism recovers the session correctly'
          : 'Test balance display accuracy during CBL batch processing window — verify the UI indicates pending/estimated balance rather than stale data',
        'Dedicated test scenarios for CBL maintenance window behaviour — verify graceful degradation and correct queuing of events for post-maintenance processing',
        'Contract tests required at each service boundary (IVS→SAS, PPS→SAS, SAS→CBL) — these should run in CI independently of E2E tests',
        'Test the Notification Service retry behaviour — simulate AWS SES and FCM failures and verify notifications are retried with exponential backoff',
      ],

      assumptions: [
        'The architecture context describes the current production state — not a future desired state',
        'The Kafka event bus is available and stable; Kafka-level failures are considered infrastructure incidents, not application test scenarios',
        input.useKnowledgeBase
          ? 'The internal knowledge base accurately reflects the current service topology and API contracts'
          : 'Service names and API paths referenced in the context are accurate and up to date',
        'The Core Banking Ledger 15-minute batch cycle applies uniformly to all account types including ISA',
      ],

      missingInformation: [
        'No information provided about the CBL event consumer error handling strategy — unclear what happens when a downstream Kafka consumer fails after a payment is settled',
        isIdentity
          ? 'Onfido webhook retry and reconciliation mechanism not described — critical for test strategy around verification session recovery'
          : 'No detail on how the API Gateway handles requests during CBL maintenance window — does it queue, reject, or return a service unavailable response?',
        'No SLA or timeout configuration provided for synchronous calls to the Core Banking Ledger REST adapter — needed to define timeout test scenarios',
        'Kafka partition and replication configuration not provided — needed to assess consumer resilience and message ordering guarantees',
      ],

      recommendedNextSteps: [
        `Raise a dedicated investigation spike for SAS-441 (duplicate payment window) — assign to Payments Squad with QE involvement to define a fix and regression test`,
        isIdentity
          ? 'Implement and document Onfido webhook reconciliation (polling fallback) — write contract tests to cover the missed-webhook scenario'
          : 'Add server-side ISA top-up allowance validation to SAS — the current client-side check is insufficient; write integration tests that bypass the UI',
        'Create a consumer fault injection test suite using Kafka test containers — simulate consumer group rebalancing, broker timeouts, and dead letter queue scenarios',
        `Map the full event chain for the ${domain} flow in Confluence — document producer, topic, consumer, and failure mode for each event`,
        'Define and document the CBL maintenance window failure behaviour in the API Gateway — implement and test the chosen strategy (queue / reject / degrade)',
        'Add architecture and integration testing to the CI pipeline for the dev environment — currently integration tests require staging access which slows feedback loops',
      ],
    }
  }
}
