/**
 * Seed realistic demo data so the app looks great on first load.
 * Called via POST /api/seed or run directly.
 */

import { writeRecord, recordExists } from '@/lib/storage'
import { logAuditEvent } from '@/lib/services/audit'
import type { TestDesignRecord, AutomationRecord, FailureAnalysisRecord, ApprovalRecord } from '@/types'

const QE_ENGINEER = 'qe.engineer@bank.internal'
const QE_LEAD = 'qe.lead@bank.internal'

export function seedDemoData(): { seeded: number; skipped: number } {
  let seeded = 0
  let skipped = 0

  // ── 1. Approved Test Design: Savings Account Journey ──────────────────────
  const td1: TestDesignRecord = {
    id: 'td_savings_journey_01',
    title: 'TD: Savings Account — New Account Opening Journey [DEMO]',
    agentType: 'test-design',
    status: 'approved',
    createdAt: '2024-11-10T09:15:00.000Z',
    updatedAt: '2024-11-11T14:30:00.000Z',
    createdBy: QE_ENGINEER,
    approvedBy: QE_LEAD,
    approvedAt: '2024-11-11T14:30:00.000Z',
    linkedIds: ['au_savings_steps_01'],
    tags: ['@regression', '@smoke', '@priority-high', '@risk-financial'],
    input: {
      storyText: `As a new customer, I want to open a savings account online so that I can start saving money with an instant-access ISA. I need to provide my personal details, choose my account type, make an initial deposit, and receive confirmation.`,
      acceptanceCriteria: `
- Customer can select from ISA, Easy-Access, and Fixed-Rate account types
- Application form validates all mandatory fields inline
- Identity verification must complete before account is created
- Minimum initial deposit of £1 is required
- Maximum initial deposit of £20,000 (ISA annual limit) applies
- Confirmation email sent within 2 minutes of account creation
- New account visible in the customer's account list within 5 minutes`,
      businessNotes: `This is a high-value acquisition journey. Drop-off rate above 15% on the deposit step triggers an alert. Priority for the Q4 release.`,
      riskNotes: `ISA annual contribution limit is a regulatory requirement — must not allow deposits above £20,000 per tax year. Identity verification failure must not leave orphaned account records.`,
    },
    output: {
      summary: `Comprehensive test coverage for the Savings Account Opening Journey. 7 test scenarios generated covering the happy path, identity verification, deposit limits, and error handling. High-risk focus on the ISA contribution limit as a regulatory requirement.`,
      scenarios: [
        {
          id: 'scn_001',
          title: 'Successful Easy-Access savings account opening',
          description: 'Customer completes the full account opening journey for an Easy-Access savings account with a valid initial deposit and receives confirmation.',
          priority: 'High',
          type: 'happy-path',
          tags: ['@regression', '@smoke', '@priority-high'],
        },
        {
          id: 'scn_002',
          title: 'ISA annual contribution limit — boundary check',
          description: 'Customer attempts to open an ISA with an initial deposit of exactly £20,000 (permitted) and then with £20,001 (blocked with error).',
          priority: 'High',
          type: 'boundary',
          tags: ['@regression', '@boundary', '@risk-financial', '@priority-high'],
        },
        {
          id: 'scn_003',
          title: 'Identity verification failure — account not created',
          description: 'Customer fails identity verification. No account record is created. Customer is directed to the branch contact flow.',
          priority: 'High',
          type: 'negative',
          tags: ['@regression', '@negative', '@risk-data-integrity'],
        },
        {
          id: 'scn_004',
          title: 'Form validation — mandatory field errors',
          description: 'Customer attempts to submit the application with blank mandatory fields. All fields display inline validation errors.',
          priority: 'Medium',
          type: 'negative',
          tags: ['@regression', '@negative'],
        },
        {
          id: 'scn_005',
          title: 'Minimum deposit — £1 accepted',
          description: 'Customer enters the minimum permitted deposit of £1. Application is accepted.',
          priority: 'Medium',
          type: 'boundary',
          tags: ['@regression', '@boundary'],
        },
      ],
      gherkinScenarios: [
        {
          id: 'gkn_001',
          title: 'Successful Easy-Access savings account opening',
          tags: ['@regression', '@smoke', '@priority-high'],
          steps: `@regression @smoke @priority-high
Feature: Savings Account Opening

  Scenario: Successful Easy-Access savings account opening
    Given I am a registered customer logged into Online Banking
    And I navigate to "Open New Account"
    When I select account type "Easy-Access Savings"
    And I complete all mandatory personal details
    And I pass identity verification
    And I enter an initial deposit of "£500.00"
    And I confirm the account opening
    Then I should see a success confirmation page
    And I should receive a confirmation email within 2 minutes
    And the new account should appear in my account list`,
        },
        {
          id: 'gkn_002',
          title: 'ISA contribution limit exceeded',
          tags: ['@regression', '@boundary', '@risk-financial'],
          steps: `@regression @boundary @risk-financial
  Scenario: ISA initial deposit exceeds annual contribution limit
    Given I am a registered customer logged into Online Banking
    And I have made no ISA contributions this tax year
    And I navigate to "Open New Account"
    When I select account type "Cash ISA"
    And I complete all mandatory personal details
    And I pass identity verification
    And I enter an initial deposit of "£20,001"
    Then I should see an error "Deposit exceeds the annual ISA allowance of £20,000"
    And no account should be created`,
        },
      ],
      edgeCases: [
        'Customer already has an open ISA this tax year — system should prevent a second ISA being opened',
        'Customer refreshes or navigates back mid-application — should offer to resume or restart',
        'Identity verification service is unavailable — graceful error with retry option',
        'Duplicate application submitted (double-click or back-forward navigation)',
      ],
      negativeCases: [
        'Initial deposit amount is zero — blocked with validation error',
        'Initial deposit contains non-numeric characters',
        'Customer under 18 — ISA application blocked with appropriate message',
        'Session expires during identity verification step',
      ],
      priorityTags: ['@priority-high', '@priority-medium'],
      riskTags: ['@risk-financial', '@risk-regulatory', '@risk-data-integrity'],
      assumptions: [
        'Identity verification is handled by a third-party service (Experian) and is out of scope for UI automation',
        'ISA annual allowance limit is £20,000 for the current tax year',
        'Confirmation email is sent by a downstream notification service',
      ],
      questions: [
        'What happens if the customer already has an ISA from a previous provider — does the system need to handle ISA transfer flows?',
        'Is there a maximum number of accounts a single customer can hold?',
        'What is the exact timeout for the identity verification step?',
      ],
    },
  }

  if (!recordExists('outputs', td1.id)) {
    writeRecord('outputs', td1)
    logAuditEvent({ eventType: 'seeded', itemId: td1.id, itemTitle: td1.title, agentType: 'test-design', actor: 'system', details: 'Demo data seeded' })
    logAuditEvent({ eventType: 'submitted', itemId: td1.id, itemTitle: td1.title, agentType: 'test-design', actor: QE_ENGINEER, details: 'Submitted for approval' })
    logAuditEvent({ eventType: 'approved', itemId: td1.id, itemTitle: td1.title, agentType: 'test-design', actor: QE_LEAD, details: 'Approved — comprehensive coverage, good risk tagging' })
    writeRecord('approvals', { id: 'apr_td1', itemId: td1.id, itemTitle: td1.title, agentType: 'test-design', status: 'approved', submittedAt: '2024-11-10T11:00:00.000Z', submittedBy: QE_ENGINEER, reviewedAt: '2024-11-11T14:30:00.000Z', reviewedBy: QE_LEAD, comments: [{ id: 'cmt_001', author: QE_LEAD, text: 'Good coverage. Approved with minor note — confirm ISA transfer scenarios are out of scope.', timestamp: '2024-11-11T14:30:00.000Z' }] })
    seeded++
  } else { skipped++ }

  // ── 2. Pending Approval: Payment Transfer Test Design ─────────────────────
  const td2: TestDesignRecord = {
    id: 'td_payment_transfer_02',
    title: 'TD: Faster Payments Transfer — Customer Initiation Journey [DEMO]',
    agentType: 'test-design',
    status: 'pending-approval',
    createdAt: '2024-11-14T10:20:00.000Z',
    updatedAt: '2024-11-14T10:45:00.000Z',
    createdBy: QE_ENGINEER,
    linkedIds: [],
    tags: ['@regression', '@priority-high', '@risk-financial'],
    input: {
      storyText: 'As a customer, I want to make a Faster Payment to another UK bank account so that money arrives in minutes.',
      acceptanceCriteria: 'Validate sort code and account number format. Apply daily limit of £10,000. Show confirmation with reference. Allow beneficiary save.',
      businessNotes: 'High fraud risk area. Requires step-up authentication for amounts above £1,000.',
      riskNotes: 'Daily limit enforcement is a compliance requirement. Idempotency must prevent duplicate transactions on double-submit.',
    },
    output: {
      summary: 'Test coverage for Faster Payments Transfer. 8 scenarios across happy path, limit enforcement, validation, and fraud controls.',
      scenarios: [
        { id: 'scn_011', title: 'Successful transfer under £1,000 — no step-up auth', description: 'Customer transfers £500 to a known beneficiary without additional authentication.', priority: 'High', type: 'happy-path', tags: ['@regression', '@smoke'] },
        { id: 'scn_012', title: 'Transfer above £1,000 — step-up authentication required', description: 'Customer transfers £2,000. System prompts for step-up authentication (OTP or biometric).', priority: 'High', type: 'happy-path', tags: ['@regression', '@priority-high'] },
        { id: 'scn_013', title: 'Daily limit enforcement — transfer blocked', description: 'Customer has already transferred £9,500 today. Attempts £600 transfer — blocked with error.', priority: 'High', type: 'boundary', tags: ['@regression', '@boundary', '@risk-financial'] },
        { id: 'scn_014', title: 'Invalid sort code format', description: 'Customer enters sort code in wrong format. Inline validation error shown.', priority: 'Medium', type: 'negative', tags: ['@regression', '@negative'] },
      ],
      gherkinScenarios: [
        {
          id: 'gkn_011',
          title: 'Successful transfer',
          tags: ['@regression', '@smoke'],
          steps: `@regression @smoke
Feature: Faster Payments Transfer

  Scenario: Successful transfer under £1,000
    Given I am logged in as a verified customer
    And I navigate to "Make a Payment"
    When I enter sort code "20-12-34" and account number "12345678"
    And I enter amount "£500.00" and reference "Rent July"
    And I confirm the payment
    Then I should see a success message with a payment reference
    And £500.00 should be debited from my account`,
        },
      ],
      edgeCases: ['Beneficiary account closed at time of payment', 'Network interruption between OTP request and submission', 'Customer changes amount after step-up auth is triggered'],
      negativeCases: ['Amount of £0.00 rejected', 'Non-UK sort code rejected', 'Reference field with SQL injection characters sanitised'],
      priorityTags: ['@priority-high', '@priority-medium'],
      riskTags: ['@risk-financial', '@risk-fraud', '@risk-compliance'],
      assumptions: ['Step-up authentication is handled by the auth service', 'Daily limit counter resets at midnight UTC'],
      questions: ['Does the daily limit apply per-account or per-customer?', 'What is the cut-off time for same-day Faster Payments?'],
    },
  }

  if (!recordExists('outputs', td2.id)) {
    writeRecord('outputs', td2)
    writeRecord('approvals', { id: 'apr_td2', itemId: td2.id, itemTitle: td2.title, agentType: 'test-design', status: 'pending-approval', submittedAt: '2024-11-14T10:45:00.000Z', submittedBy: QE_ENGINEER, comments: [] })
    logAuditEvent({ eventType: 'seeded', itemId: td2.id, itemTitle: td2.title, agentType: 'test-design', actor: 'system', details: 'Demo data seeded' })
    logAuditEvent({ eventType: 'submitted', itemId: td2.id, itemTitle: td2.title, agentType: 'test-design', actor: QE_ENGINEER, details: 'Submitted for approval' })
    seeded++
  } else { skipped++ }

  // ── 3. Approved Automation Draft ──────────────────────────────────────────
  const au1: AutomationRecord = {
    id: 'au_savings_steps_01',
    title: 'AUTO: Savings Account Opening — Playwright BDD Steps [DEMO]',
    agentType: 'automation',
    status: 'approved',
    createdAt: '2024-11-11T16:00:00.000Z',
    updatedAt: '2024-11-12T09:00:00.000Z',
    createdBy: QE_ENGINEER,
    approvedBy: QE_LEAD,
    approvedAt: '2024-11-12T09:00:00.000Z',
    linkedIds: ['td_savings_journey_01'],
    tags: ['playwright', 'bdd', 'savings'],
    input: {
      gherkinText: `@regression @smoke @priority-high
Feature: Savings Account Opening

  Scenario: Successful Easy-Access savings account opening
    Given I am a registered customer logged into Online Banking
    And I navigate to "Open New Account"
    When I select account type "Easy-Access Savings"
    And I complete all mandatory personal details
    And I pass identity verification
    And I enter an initial deposit of "£500.00"
    And I confirm the account opening
    Then I should see a success confirmation page`,
      frameworkNotes: 'Use @cucumber/cucumber v10 with Playwright. Page objects in src/pages/. World type in src/support/world.ts. All monetary amounts strip £ before entering.',
      linkedTestDesignId: 'td_savings_journey_01',
    },
    output: {
      stepDefinitions: [
        { id: 'step_001', keyword: 'Given', pattern: 'I am a registered customer logged into Online Banking', implementation: `await loginPage.loginAs(this.testData.customer)`, imports: ['LoginPage from ../pages/LoginPage'] },
        { id: 'step_002', keyword: 'When', pattern: 'I select account type {string}', implementation: `await accountOpeningPage.selectAccountType(accountType)`, imports: ['AccountOpeningPage from ../pages/AccountOpeningPage'] },
        { id: 'step_003', keyword: 'When', pattern: 'I enter an initial deposit of {string}', implementation: `await accountOpeningPage.enterDeposit(amount.replace(/[£,]/g, ''))`, imports: [] },
        { id: 'step_004', keyword: 'Then', pattern: 'I should see a success confirmation page', implementation: `await expect(page.getByRole('heading', { name: /account opened/i })).toBeVisible()`, imports: ['expect from @playwright/test'] },
      ],
      pageObjects: [
        {
          name: 'AccountOpeningPage',
          filePath: 'src/pages/AccountOpeningPage.ts',
          locators: [
            { name: 'accountTypeSelect', strategy: 'data-testid', value: 'account-type-selector', rationale: 'Stable test ID for the account type dropdown' },
            { name: 'depositInput', strategy: 'data-testid', value: 'initial-deposit-input', rationale: 'Numeric-only input — strip currency symbol before filling' },
            { name: 'confirmButton', strategy: 'role', value: "button, { name: /confirm|open account/i }", rationale: 'Role-based for resilience to button label changes' },
          ],
          methods: ['selectAccountType(type: string)', 'completePersonalDetails(data: CustomerData)', 'enterDeposit(amount: string)', 'confirmOpening()'],
        },
      ],
      locators: [
        { name: 'accountTypeSelector', strategy: 'data-testid', value: 'account-type-selector', rationale: 'Request data-testid from dev team' },
        { name: 'depositInput', strategy: 'data-testid', value: 'initial-deposit-input', rationale: 'Numeric input for initial deposit amount' },
      ],
      helperSuggestions: ['Create a CustomerDataFactory helper to generate valid customer profiles for test isolation', 'Add a cleanup fixture to close test accounts after each scenario'],
      implementationNotes: ['The deposit amount step strips currency symbols — confirm whether the input accepts raw numeric or formatted values', 'Identity verification step uses a test bypass flag in the non-prod environment'],
      warnings: ['Identity verification step (I pass identity verification) calls a third-party service — ensure test environment bypass is configured'],
      assumptions: ['Framework uses @cucumber/cucumber v10 with Playwright world integration', 'Test bypass for identity verification is available in the QA environment'],
      fullCode: `// ─── Step Definitions: Savings Account Opening ───────────────────────────────
// Generated draft — reviewed and approved by ${QE_LEAD}

import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { AccountOpeningPage } from '../pages/AccountOpeningPage'
import { LoginPage } from '../pages/LoginPage'
import type { ICustomWorld } from '../support/world'

Given('I am a registered customer logged into Online Banking', async function (this: ICustomWorld) {
  const loginPage = new LoginPage(this.page)
  await loginPage.navigate()
  await loginPage.loginAs(this.testData.customer)
  await expect(this.page).toHaveURL(/dashboard/)
})

Given('I navigate to {string}', async function (this: ICustomWorld, section: string) {
  await this.page.getByRole('link', { name: section }).click()
})

When('I select account type {string}', async function (this: ICustomWorld, accountType: string) {
  const page = new AccountOpeningPage(this.page)
  await page.selectAccountType(accountType)
})

When('I complete all mandatory personal details', async function (this: ICustomWorld) {
  const page = new AccountOpeningPage(this.page)
  await page.completePersonalDetails(this.testData.customer)
})

When('I pass identity verification', async function (this: ICustomWorld) {
  // Uses test environment bypass — see src/support/fixtures/identityVerification.ts
  await this.page.getByTestId('idv-test-bypass-btn').click()
})

When('I enter an initial deposit of {string}', async function (this: ICustomWorld, amount: string) {
  const page = new AccountOpeningPage(this.page)
  await page.enterDeposit(amount.replace(/[£,]/g, ''))
})

When('I confirm the account opening', async function (this: ICustomWorld) {
  const page = new AccountOpeningPage(this.page)
  await page.confirmOpening()
})

Then('I should see a success confirmation page', async function (this: ICustomWorld) {
  await expect(this.page.getByRole('heading', { name: /account opened successfully/i }))
    .toBeVisible({ timeout: 15_000 })
})`,
    },
  }

  if (!recordExists('outputs', au1.id)) {
    writeRecord('outputs', au1)
    writeRecord('approvals', { id: 'apr_au1', itemId: au1.id, itemTitle: au1.title, agentType: 'automation', status: 'approved', submittedAt: '2024-11-11T17:00:00.000Z', submittedBy: QE_ENGINEER, reviewedAt: '2024-11-12T09:00:00.000Z', reviewedBy: QE_LEAD, comments: [{ id: 'cmt_002', author: QE_LEAD, text: 'Clean implementation. Approved — identity verification bypass assumption is correctly noted.', timestamp: '2024-11-12T09:00:00.000Z' }] })
    logAuditEvent({ eventType: 'seeded', itemId: au1.id, itemTitle: au1.title, agentType: 'automation', actor: 'system', details: 'Demo data seeded' })
    logAuditEvent({ eventType: 'approved', itemId: au1.id, itemTitle: au1.title, agentType: 'automation', actor: QE_LEAD, details: 'Approved' })
    seeded++
  } else { skipped++ }

  // ── 4. Failure Analysis — Real Defect, Pending Approval ───────────────────
  const fa1: FailureAnalysisRecord = {
    id: 'fa_transfer_timeout_01',
    title: 'FA: Transfer Amount Validation — Assertion Failure on Error Message [DEMO]',
    agentType: 'failure-analysis',
    status: 'pending-approval',
    createdAt: '2024-11-15T08:30:00.000Z',
    updatedAt: '2024-11-15T08:45:00.000Z',
    createdBy: QE_ENGINEER,
    linkedIds: ['td_payment_transfer_02'],
    tags: ['real-defect', 'high'],
    input: {
      scenarioName: 'Transfer exceeds daily limit — error message validation',
      failedLog: `[14:23:45] Running: Transfer exceeds daily limit — error message validation
[14:23:46] ✓ Given I am logged in as a verified customer (1.2s)
[14:23:48] ✓ And I navigate to "Make a Payment" (1.8s)
[14:23:49] ✓ When I enter sort code "20-12-34" and account number "12345678" (0.6s)
[14:23:50] ✓ And I enter amount "£10,600.00" and reference "Test payment" (0.4s)
[14:23:52] ✓ And I confirm the payment (1.4s)
[14:23:53] ✗ Then I should see an error "Daily limit exceeded" (0.3s)
  AssertionError: expect(received).toContainText(expected)
  Expected string: "Daily limit exceeded"
  Received string: "Payment cannot be processed at this time"`,
      stackTrace: `AssertionError: expect(received).toContainText(expected)

Expected string: "Daily limit exceeded"
Received string: "Payment cannot be processed at this time"

  at TransferPage.assertErrorMessage (src/pages/TransferPage.ts:87:5)
  at Context.<anonymous> (src/steps/transfer.steps.ts:44:3)

  - Expected: "Daily limit exceeded"
  + Received:  "Payment cannot be processed at this time"`,
      environmentNotes: 'QA environment. Build: 2.14.3-rc1. Last green run: Build 2.14.2.',
    },
    output: {
      summary: `Assertion failure in scenario "Transfer exceeds daily limit". The test expects the error message "Daily limit exceeded" but the application returns "Payment cannot be processed at this time". This is a HIGH confidence real defect — the error message text has changed between builds 2.14.2 and 2.14.3-rc1, likely due to a copy/content change.`,
      rootCause: `The application is displaying a generic error message ("Payment cannot be processed at this time") instead of the specific, user-friendly message ("Daily limit exceeded") that was previously displayed and is specified in the acceptance criteria. This divergence from the expected error copy is either: (1) an intentional copy change that was not reflected in the test expectation, or (2) an unintentional regression in the error handling logic. Given the build delta (2.14.2 → 2.14.3-rc1), a targeted git diff on the error message constants file should identify the change.`,
      confidenceLevel: 'High',
      failureCategory: 'real-defect',
      flakynessAssessment: `This is NOT a flaky failure. The error message mismatch is deterministic — it will fail on every run until resolved. The test reached the assertion correctly and the application responded, so there are no timing or environment factors involved.`,
      suggestedNextActions: [
        `Review the git diff between build 2.14.2 and 2.14.3-rc1 — specifically error message constants and the daily limit validation handler`,
        `Confirm with the product owner whether the error message copy was intentionally changed`,
        `If copy was intentionally changed: update the test expectation to match the new message`,
        `If copy was NOT intentionally changed: raise as a regression defect against build 2.14.3-rc1`,
        `Check whether other error messages in the payment flow are also affected`,
      ],
      locatorRecommendations: [],
      draftDefectNote: `**Defect: Transfer Daily Limit — Incorrect Error Message Copy**

**Summary:** The Faster Payments daily limit error message displays "Payment cannot be processed at this time" instead of the specified "Daily limit exceeded".

**Build:** 2.14.3-rc1
**Last known good:** 2.14.2
**Environment:** QA

**Steps to reproduce:**
1. Log in as a customer with £10,000 daily transfer limit
2. Navigate to "Make a Payment"
3. Enter an amount that exceeds the daily limit (e.g. £10,600)
4. Confirm the payment

**Expected:** Error message: "Daily limit exceeded"
**Actual:** Error message: "Payment cannot be processed at this time"

**Impact:** The generic error message does not inform the customer of the specific reason their payment failed, which is a poor UX and may not meet regulatory requirements for clear communication.

**Confidence:** High
**Classification:** Real defect — regression
**Flakiness risk:** None`,
      escalationNotes: `Escalate to the payments development team immediately. This is a regression between builds and affects a customer-facing error message in a compliance-sensitive flow. Block promotion of 2.14.3-rc1 to staging until resolved.`,
      relatedScenarios: [
        'Transfer exceeds daily limit — boundary check',
        'Transfer — insufficient funds error message',
        'Transfer — step-up authentication failure message',
      ],
    },
  }

  if (!recordExists('outputs', fa1.id)) {
    writeRecord('outputs', fa1)
    writeRecord('approvals', { id: 'apr_fa1', itemId: fa1.id, itemTitle: fa1.title, agentType: 'failure-analysis', status: 'pending-approval', submittedAt: '2024-11-15T08:45:00.000Z', submittedBy: QE_ENGINEER, comments: [] })
    logAuditEvent({ eventType: 'seeded', itemId: fa1.id, itemTitle: fa1.title, agentType: 'failure-analysis', actor: 'system', details: 'Demo data seeded' })
    logAuditEvent({ eventType: 'submitted', itemId: fa1.id, itemTitle: fa1.title, agentType: 'failure-analysis', actor: QE_ENGINEER, details: 'Submitted for approval — real defect identified, recommend blocking 2.14.3-rc1' })
    seeded++
  } else { skipped++ }

  // ── 5. Rejected Failure Analysis: Flaky Timeout ───────────────────────────
  const fa2: FailureAnalysisRecord = {
    id: 'fa_login_flaky_02',
    title: 'FA: Login Page Load Timeout — Flaky CI Failure [DEMO]',
    agentType: 'failure-analysis',
    status: 'rejected',
    createdAt: '2024-11-13T11:00:00.000Z',
    updatedAt: '2024-11-13T15:30:00.000Z',
    createdBy: QE_ENGINEER,
    rejectedBy: QE_LEAD,
    rejectedAt: '2024-11-13T15:30:00.000Z',
    linkedIds: [],
    tags: ['flaky', 'medium'],
    input: {
      scenarioName: 'Login — successful authentication smoke test',
      failedLog: `[09:14:22] Running: Login — successful authentication smoke test
[09:14:24] ✓ Given I navigate to the login page (2.1s)
[09:14:27] ✗ When I enter valid credentials (30.0s)
  TimeoutError: locator.fill: Timeout 30000ms exceeded.
  waiting for locator('[data-testid="username-input"]')`,
      stackTrace: `TimeoutError: locator.fill: Timeout 30000ms exceeded.
  waiting for locator('[data-testid="username-input"]')

    at LoginPage.enterUsername (src/pages/LoginPage.ts:34:5)
    at Context.<anonymous> (src/steps/login.steps.ts:12:3)`,
      environmentNotes: 'CI pipeline — GitHub Actions runner. Self-hosted runner had 95% CPU during this run. Scenario passed on immediate re-run.',
    },
    output: {
      summary: 'Timeout failure on the login page username input. High confidence this is an environment/resource issue on the CI runner, not a product defect. Scenario passed on immediate re-run.',
      rootCause: 'The test failed because the login page username input did not appear within the 30-second timeout. This occurred on a CI runner under 95% CPU load, which caused the browser to be slow to render. The element exists and works correctly — confirmed by the immediate re-run passing.',
      confidenceLevel: 'High',
      failureCategory: 'environment',
      flakynessAssessment: 'High flakiness probability due to CI resource contention. Not a product defect.',
      suggestedNextActions: ['Monitor CI runner resource usage', 'Consider increasing the default timeout for login steps to 45s', 'Investigate self-hosted runner capacity'],
      locatorRecommendations: [],
      draftDefectNote: `**Not raised as a defect** — classified as environment/flakiness issue.`,
      escalationNotes: 'Escalate to DevOps/platform team to review CI runner capacity. Do not raise as a product defect.',
      relatedScenarios: ['Login — invalid credentials', 'Login — session timeout'],
    },
  }

  if (!recordExists('outputs', fa2.id)) {
    writeRecord('outputs', fa2)
    writeRecord('approvals', { id: 'apr_fa2', itemId: fa2.id, itemTitle: fa2.title, agentType: 'failure-analysis', status: 'rejected', submittedAt: '2024-11-13T11:30:00.000Z', submittedBy: QE_ENGINEER, reviewedAt: '2024-11-13T15:30:00.000Z', reviewedBy: QE_LEAD, comments: [{ id: 'cmt_003', author: QE_LEAD, text: 'Reject — this is CI flakiness, not a product issue. No defect needed. Update runner capacity ticket instead.', timestamp: '2024-11-13T15:30:00.000Z' }] })
    logAuditEvent({ eventType: 'seeded', itemId: fa2.id, itemTitle: fa2.title, agentType: 'failure-analysis', actor: 'system', details: 'Demo data seeded' })
    logAuditEvent({ eventType: 'rejected', itemId: fa2.id, itemTitle: fa2.title, agentType: 'failure-analysis', actor: QE_LEAD, details: 'Rejected — confirmed CI flakiness, not a product defect' })
    seeded++
  } else { skipped++ }

  return { seeded, skipped }
}
