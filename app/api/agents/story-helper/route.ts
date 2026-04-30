/**
 * Story Helper API Route
 *
 * POST /api/agents/story-helper
 * Body: { description: string }
 *
 * Converts a plain-English feature description into a properly structured
 * user story (As a / I want / So that) with acceptance criteria.
 *
 * When AI_PROVIDER=gemini and GEMINI_API_KEY is present: uses Gemini.
 * Otherwise: returns a smart keyword-aware mock response.
 *
 * This route is intentionally lightweight — it does NOT go through the
 * full agent service layer (no record persistence, no audit log) because
 * it is a pre-processing helper, not a final artefact.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const StoryHelperSchema = z.object({
  description: z
    .string()
    .min(10, 'Please describe the feature in at least 10 characters.')
    .max(3000, 'Description is too long — please keep it under 3,000 characters.'),
})

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildConversionPrompt(description: string): string {
  return `You are a senior Business Analyst and QA expert at a UK financial services company.

A team member has described a feature or task in plain English. Your job is to convert it into a properly formatted user story with well-defined acceptance criteria.

FEATURE DESCRIPTION:
${description}

Return a single JSON object with this exact structure. No markdown, no code fences, just the JSON.

{
  "storyText": "As a [specific persona], I want [clear goal] so that [concrete benefit]. Maximum 2 sentences. Must strictly follow the As a / I want / So that format.",
  "acceptanceCriteria": "- Criterion 1\\n- Criterion 2\\n- Criterion 3",
  "businessNotes": "2-3 sentences of implied business context, priority signals, or stakeholder notes. Empty string if nothing meaningful to infer.",
  "riskNotes": "2-3 sentences of implied risks, regulatory concerns, or technical constraints. Empty string if nothing meaningful to infer."
}

RULES:
- Write in British English. Use £ for currency.
- storyText must strictly follow As a / I want / So that — no deviations.
- Generate 5–8 acceptance criteria that are specific, testable, and unambiguous.
- Each criterion starts with a dash and newline (- criterion\\n).
- Infer realistic ACs from the domain — do not just restate the description.
- Treat financial, identity, and data-privacy features as high-risk and note accordingly.
- Return ONLY the JSON object, nothing else.`
}

// ─── Mock conversion (keyword-aware) ─────────────────────────────────────────

function generateMockConversion(description: string): {
  storyText: string
  acceptanceCriteria: string
  businessNotes: string
  riskNotes: string
} {
  const isPayment = /payment|transfer|send money|pay |transaction|direct debit/i.test(description)
  const isAuth = /login|sign.?in|password|reset|auth|account access|log.?out|2fa|mfa/i.test(description)
  const isAccount = /account|profile|setting|registration|sign.?up|onboard|open.*account/i.test(description)
  const isStatement = /statement|download|export|history|transaction.*list|PDF|CSV/i.test(description)
  const isSearch = /search|find|filter|browse|look for|sort/i.test(description)
  const isNotification = /notif|alert|email|sms|remind|push/i.test(description)
  const isReport = /report|dashboard|analytic|insight|metric|chart/i.test(description)

  if (isStatement) {
    return {
      storyText:
        'As a registered customer, I want to view and download my account statements online so that I can review my transaction history and share records without contacting customer support.',
      acceptanceCriteria: `- Customer can view statements for the last 24 months
- Customer can filter statements by custom date range
- Statements are available to download in PDF and CSV formats
- Each statement download is logged for audit purposes
- Statement generation completes within 5 seconds for standard date ranges
- Statements are only accessible to the account holder or an authorised power of attorney
- Download link expires after 60 minutes to prevent unauthorised sharing
- Empty state is shown clearly if no transactions exist for the selected period`,
      businessNotes:
        'Self-service statement access reduces contact centre volume. Target: 80% of customers able to obtain statements without agent assistance. PDF format is preferred by regulators for formal records.',
      riskNotes:
        'Statements contain sensitive personal and financial data — must be served over HTTPS and require active authentication. Ensure access controls prevent one customer seeing another\'s data. Retention policy must comply with FCA record-keeping requirements.',
    }
  }

  if (isPayment) {
    return {
      storyText:
        'As a registered customer, I want to make a payment or transfer funds to another account so that I can manage my finances quickly and securely without visiting a branch.',
      acceptanceCriteria: `- Customer can initiate a payment from their current or savings account
- Customer must enter a valid payee sort code and account number
- System validates the payment amount does not exceed the available balance
- System enforces the customer's daily transfer limit
- Customer receives an on-screen confirmation with a transaction reference upon success
- Failed payments display a clear, actionable error message
- All payment attempts (successful and failed) are logged for audit purposes
- Duplicate payment detection prevents double-submission within a 60-second window`,
      businessNotes:
        'Payments are a core customer journey. Any degradation directly impacts customer trust and NPS. Monitor step drop-off rates and error rates in real time.',
      riskNotes:
        'Financial transactions carry FCA regulatory obligations. Idempotency is critical to prevent duplicate charges. Ensure PCI DSS compliance for any card data. Fraud detection signals should be evaluated before authorisation.',
    }
  }

  if (isAuth) {
    return {
      storyText:
        'As a registered customer, I want to securely access or recover my account so that I can use banking services without being locked out or relying on customer support.',
      acceptanceCriteria: `- Customer can request a password reset via their registered email address
- Reset link expires after 60 minutes and can only be used once
- New password must meet complexity requirements: 8+ characters, uppercase, number, special character
- Customer is notified by email when a reset is requested
- Account is temporarily locked after 5 consecutive failed login attempts
- Customer is notified of the lockout and how to regain access
- All authentication events are logged with timestamp and IP address
- Multi-factor authentication is triggered for high-risk sessions`,
      businessNotes:
        'Self-service account recovery reduces contact centre inbound volume. Target: 95% of resets completed without agent involvement. Authentication events feed into fraud monitoring.',
      riskNotes:
        'Account takeover is a high-probability attack vector. Reset tokens must have sufficient entropy. Rate-limit reset requests per account and per IP. Session fixation attacks must be prevented by issuing a new session token after authentication.',
    }
  }

  if (isAccount) {
    return {
      storyText:
        'As a prospective customer, I want to create and manage my account online so that I can access banking services and keep my details up to date without visiting a branch.',
      acceptanceCriteria: `- User can register with their full name, date of birth, email, and a chosen password
- All mandatory fields are validated inline before submission
- Email address must be unique — duplicate registration is blocked with a clear message
- User receives a verification email within 2 minutes of submitting the registration form
- Account is not activated until the email address is verified
- User can update profile information at any time after registration
- Changes to sensitive fields (email, password) require re-authentication
- Account data is only retained if the user consents to the privacy policy`,
      businessNotes:
        'Registration is the first impression of the product and directly impacts acquisition conversion rate. Benchmark: complete registration in under 3 minutes. Each abandoned step should trigger a re-engagement email.',
      riskNotes:
        'GDPR applies — data must not be persisted if registration is abandoned before consent is collected. Implement CAPTCHA or bot-detection at registration to prevent account farming.',
    }
  }

  if (isSearch) {
    return {
      storyText:
        'As a user, I want to search and filter content to find what I need quickly so that I can locate relevant information without browsing through large volumes of data.',
      acceptanceCriteria: `- User can enter a search term of at least 2 characters to trigger a search
- Results are displayed within 2 seconds for standard queries
- User can filter results by category, date range, and status
- An empty results state displays a helpful message and suggested alternatives
- Matched search terms are highlighted in the results list
- User can sort results by relevance, date, or alphabetically
- Search results are paginated — maximum 20 results per page
- Search is accessible via keyboard only (no mouse required)`,
      businessNotes:
        'Search is a high-frequency interaction. Performance target: p95 response time < 2 seconds. Relevance tuning should be data-driven using click-through metrics.',
      riskNotes:
        'All search inputs must be sanitised to prevent injection attacks. Access controls must be enforced on results — users must not see content outside their permissions.',
    }
  }

  if (isNotification) {
    return {
      storyText:
        'As a customer, I want to receive timely notifications about important account events so that I can stay informed and respond quickly without having to log in to check.',
      acceptanceCriteria: `- Customer receives a notification within 60 seconds of a qualifying account event
- Customer can choose to receive notifications via email, SMS, or push (where available)
- Customer can configure which events trigger notifications in their account settings
- Notification preferences can be updated at any time and take effect immediately
- Notifications do not contain full account numbers or sensitive data in the body
- Unsubscribe/opt-out is available from every email notification
- Failed notification delivery is retried up to 3 times before logging as undelivered
- A notification history is available for the last 90 days`,
      businessNotes:
        'Proactive notifications reduce fraud dispute volume and improve customer trust scores. SMS incurs cost per message — ensure opt-in is explicit and well-governed.',
      riskNotes:
        'Notification content must be carefully controlled to avoid inadvertently exposing sensitive data. Ensure GDPR compliance for SMS/email marketing vs. transactional notifications. Unsubscribe must be honoured within 10 working days per PECR.',
    }
  }

  if (isReport) {
    return {
      storyText:
        'As a business user, I want to view and export reports and analytics so that I can make data-driven decisions and share insights with stakeholders efficiently.',
      acceptanceCriteria: `- User can access reports filtered by date range, product, and region
- Key metrics are displayed as charts and summary tables
- Reports can be exported in PDF and CSV formats
- Report generation completes within 10 seconds for standard date ranges
- Data displayed is no more than 5 minutes stale
- Access to reports is restricted by user role
- All report exports are logged with the user's identity and timestamp
- An empty state is shown clearly if no data matches the selected filters`,
      businessNotes:
        'Reporting is used by senior stakeholders for strategic decisions. Data accuracy is paramount. Establish a data refresh SLA and communicate it clearly in the UI.',
      riskNotes:
        'Reports may contain commercially sensitive or customer PII — restrict access by role and ensure exports are watermarked or logged. Regulatory reports must match source-of-truth data exactly.',
    }
  }

  // Generic fallback — still well-structured
  const shortDesc = description.replace(/\n/g, ' ').substring(0, 120).trim()
  return {
    storyText: `As a user, I want to ${shortDesc.charAt(0).toLowerCase() + shortDesc.slice(1)} so that I can achieve my goal efficiently and without friction.`,
    acceptanceCriteria: `- The feature is accessible to authorised users only
- All mandatory inputs are validated before submission with inline error messages
- The system provides clear feedback for both success and failure states
- The operation completes within accepted performance thresholds (under 3 seconds)
- Changes are persisted reliably and reflected immediately in the UI
- The feature meets WCAG 2.1 AA accessibility standards
- All user-initiated actions are logged for audit purposes
- An appropriate confirmation or undo mechanism is provided for destructive actions`,
    businessNotes: `This feature addresses the following user need: "${shortDesc}". Prioritise correctness and clear error handling over aesthetic polish in the first iteration.`,
    riskNotes:
      'Validate all inputs at the server boundary — never rely solely on client-side validation. Ensure access controls are enforced consistently across the API layer. Review for any GDPR or data-retention implications before release.',
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = StoryHelperSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.description?.[0] ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { description } = parsed.data
    const provider = process.env.AI_PROVIDER ?? 'gemini'

    // ─ Mock mode
    if (provider === 'mock') {
      await new Promise((r) => setTimeout(r, 1300)) // simulate latency
      return NextResponse.json({ success: true, ...generateMockConversion(description) })
    }

    // ─ Gemini mode
    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        // No key → fall back to mock silently
        return NextResponse.json({ success: true, ...generateMockConversion(description) })
      }

      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const client = new GoogleGenerativeAI(apiKey)
        const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
        const model = client.getGenerativeModel({ model: modelName })

        const result = await model.generateContent(buildConversionPrompt(description))
        const text = result.response.text().trim()

        // Strip any accidental markdown fences
        const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

        const data = JSON.parse(clean) as {
          storyText: string
          acceptanceCriteria: string
          businessNotes: string
          riskNotes: string
        }

        return NextResponse.json({ success: true, ...data })
      } catch {
        // JSON parse or API error → graceful mock fallback
        return NextResponse.json({ success: true, ...generateMockConversion(description) })
      }
    }

    // Default fallback
    return NextResponse.json({ success: true, ...generateMockConversion(description) })
  } catch (error) {
    console.error('[story-helper] Error:', error)
    return NextResponse.json({ error: 'Failed to convert description' }, { status: 500 })
  }
}
