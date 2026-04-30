/**
 * Jira Issue Fetcher API Route
 *
 * POST /api/jira-fetch
 * Body: { jiraUrl: string }
 *
 * If JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN are set in .env.local,
 * this route fetches the real Jira issue via the Jira REST API v3.
 *
 * Otherwise it returns a realistic demo issue (mock mode) so the UI
 * is fully testable without Jira credentials.
 *
 * Environment variables (all optional — app falls back to mock if absent):
 *   JIRA_BASE_URL    e.g. https://yourcompany.atlassian.net
 *   JIRA_EMAIL       Atlassian account email (for Basic auth)
 *   JIRA_API_TOKEN   Atlassian API token (not your password)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const JiraFetchSchema = z.object({
  jiraUrl: z.string().min(1, 'URL is required'),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract a Jira issue key (e.g. PROJ-123) from any Jira URL. */
function extractIssueKey(url: string): string | null {
  const match = url.match(/([A-Z][A-Z0-9_]+-[0-9]+)/)
  return match ? match[1] : null
}

/** Recursively extract plain text from Atlassian Document Format (ADF). */
function extractAdfText(node: Record<string, unknown>): string {
  if (!node || typeof node !== 'object') return ''
  if (node.type === 'text') return String(node.text ?? '')
  if (node.type === 'hardBreak' || node.type === 'paragraph') {
    const inner = (node.content as Record<string, unknown>[] | undefined)
      ?.map(extractAdfText)
      .join('') ?? ''
    return inner + '\n'
  }
  if (Array.isArray(node.content)) {
    return (node.content as Record<string, unknown>[]).map(extractAdfText).join('')
  }
  return ''
}

// ─── Real Jira fetch ──────────────────────────────────────────────────────────

async function fetchJiraIssue(issueKey: string) {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '')
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN

  if (!baseUrl || !email || !token) return null

  const url = `${baseUrl}/rest/api/3/issue/${issueKey}?fields=summary,description,issuetype,priority,labels,comment`
  const auth = Buffer.from(`${email}:${token}`).toString('base64')

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
      // 10-second timeout
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function mapRealIssue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  issue: Record<string, any>,
  issueKey: string
) {
  const fields = issue.fields ?? {}
  const summary: string = fields.summary ?? issueKey
  const type: string = fields.issuetype?.name ?? 'Story'
  const priority: string = fields.priority?.name ?? 'Medium'
  const labels: string[] = fields.labels ?? []

  // Extract description text from ADF
  let descText = ''
  if (fields.description && typeof fields.description === 'object') {
    descText = extractAdfText(fields.description as Record<string, unknown>).trim()
  } else if (typeof fields.description === 'string') {
    descText = fields.description.trim()
  }

  // Shape into user story + ACs
  const storyText = descText
    ? descText.length > 400
      ? descText.substring(0, 400) + '…'
      : descText
    : `As a user, I want to ${summary.toLowerCase()} so that [add the benefit here].`

  const acceptanceCriteria = '- [Review the Jira issue description and add acceptance criteria]\n- [Add more criteria as needed]'

  return {
    issueKey,
    summary,
    type,
    priority,
    labels,
    storyText,
    acceptanceCriteria,
    businessNotes: `Jira issue: ${issueKey} · ${type} · ${priority} priority${labels.length ? ' · Labels: ' + labels.join(', ') : ''}`,
    riskNotes: '',
    source: 'jira' as const,
  }
}

// ─── Mock response (when no Jira credentials configured) ─────────────────────

function buildMockResponse(issueKey: string) {
  return {
    issueKey,
    summary: 'Online Account Opening — Customer Identity Verification',
    type: 'Story',
    priority: 'High',
    labels: ['identity', 'kyc', 'account-opening'],
    storyText: `As a new customer applying to open a bank account, I want to complete an identity verification step so that my identity can be confirmed and my account can be created securely in line with regulatory requirements.`,
    acceptanceCriteria: `- Customer can upload a valid passport or UK driving licence for verification
- Third-party verification service must respond within 30 seconds
- Failed automated verification routes customer to manual review queue
- Manual review team is notified of new submissions within 5 minutes
- Customer receives a status email after automated and manual review
- Customer must not be able to proceed to account creation without passing verification
- Verification attempt is logged for audit purposes`,
    businessNotes: `Jira issue: ${issueKey} · Story · High priority. Note: Jira credentials not configured — showing demo data. Add JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN to .env.local to connect to your real Jira instance.`,
    riskNotes: 'KYC is a regulatory requirement — identity data must not be retained beyond the verification window without explicit customer consent. Non-compliance carries FCA enforcement risk.',
    source: 'mock' as const,
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = JiraFetchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { jiraUrl } = parsed.data
    const issueKey = extractIssueKey(jiraUrl)

    if (!issueKey) {
      return NextResponse.json(
        {
          error:
            'Could not find a Jira issue key in the URL. Expected format: PROJ-123 (e.g. https://company.atlassian.net/browse/PROJ-123)',
        },
        { status: 400 }
      )
    }

    // Try the real Jira API first
    const realIssue = await fetchJiraIssue(issueKey)
    if (realIssue) {
      return NextResponse.json(mapRealIssue(realIssue, issueKey))
    }

    // Fall back to mock (demo / no credentials)
    return NextResponse.json(buildMockResponse(issueKey))
  } catch (error) {
    console.error('[jira-fetch] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch Jira issue' }, { status: 500 })
  }
}
