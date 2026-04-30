/**
 * Jira Issue Creator API Route
 *
 * POST /api/jira-create
 *
 * Creates one Jira issue per item in the `items` array.
 * Returns per-item results so the UI can show individual success/failure.
 *
 * Requires in .env.local:
 *   JIRA_BASE_URL    https://yourcompany.atlassian.net
 *   JIRA_EMAIL       your.email@company.com
 *   JIRA_API_TOKEN   your_api_token
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// ─── Validation ───────────────────────────────────────────────────────────────

const IssueItemSchema = z.object({
  summary: z.string().min(1),
  descriptionText: z.string(),     // plain text — converted to ADF server-side
  gherkinSteps: z.string().optional(), // if present, added as a code block in ADF
  priority: z.enum(['High', 'Medium', 'Low']).optional(),
  labels: z.array(z.string()).optional(),
  itemType: z.enum(['scenario', 'gherkin', 'edge-case', 'negative-case']),
})

const CreateSchema = z.object({
  projectKey: z.string().min(1, 'Project key is required'),
  issueType: z.string().min(1, 'Issue type is required'),
  items: z.array(IssueItemSchema).min(1, 'Select at least one item'),
})

type IssueItem = z.infer<typeof IssueItemSchema>

// ─── ADF (Atlassian Document Format) builder ──────────────────────────────────

type AdfNode = Record<string, unknown>

function adfText(text: string, bold = false): AdfNode {
  return {
    type: 'text',
    text,
    ...(bold ? { marks: [{ type: 'strong' }] } : {}),
  }
}

function adfParagraph(...content: AdfNode[]): AdfNode {
  return { type: 'paragraph', content }
}

function adfHeading(level: number, text: string): AdfNode {
  return { type: 'heading', attrs: { level }, content: [adfText(text)] }
}

function adfBulletList(items: string[]): AdfNode {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [adfText(item)] }],
    })),
  }
}

function adfCodeBlock(code: string, language = 'plain'): AdfNode {
  return {
    type: 'codeBlock',
    attrs: { language },
    content: [adfText(code)],
  }
}

function adfRule(): AdfNode {
  return { type: 'rule' }
}

function buildScenarioAdf(item: IssueItem): AdfNode {
  const nodes: AdfNode[] = []

  if (item.descriptionText) {
    nodes.push(adfHeading(3, 'Description'))
    nodes.push(adfParagraph(adfText(item.descriptionText)))
  }

  const details: string[] = []
  if (item.priority) details.push(`Priority: ${item.priority}`)
  if (item.itemType) details.push(`Type: ${item.itemType.replace('-', ' ')}`)
  if (item.labels && item.labels.length > 0) details.push(`Tags: ${item.labels.join(', ')}`)
  if (details.length > 0) {
    nodes.push(adfHeading(3, 'Details'))
    nodes.push(adfBulletList(details))
  }

  if (item.gherkinSteps) {
    nodes.push(adfHeading(3, 'Gherkin Steps'))
    nodes.push(adfCodeBlock(item.gherkinSteps, 'gherkin'))
  }

  nodes.push(adfRule())
  nodes.push(adfParagraph(
    adfText('Created by '),
    adfText('AI QE Control Tower', true),
    adfText(' · QE Savings Lab')
  ))

  return { version: 1, type: 'doc', content: nodes }
}

function buildSimpleAdf(text: string): AdfNode {
  const paragraphs = text
    .split('\n')
    .filter(Boolean)
    .map((line) => adfParagraph(adfText(line)))

  return {
    version: 1,
    type: 'doc',
    content: [
      ...paragraphs,
      adfRule(),
      adfParagraph(adfText('Created by '), adfText('AI QE Control Tower', true)),
    ],
  }
}

// ─── Priority mapping ─────────────────────────────────────────────────────────

function mapPriority(p?: string): string {
  switch (p) {
    case 'High':   return 'High'
    case 'Low':    return 'Low'
    default:       return 'Medium'
  }
}

// ─── Single issue creator ─────────────────────────────────────────────────────

async function createJiraIssue(
  baseUrl: string,
  auth: string,
  projectKey: string,
  issueType: string,
  item: IssueItem
): Promise<{ success: true; issueKey: string; issueUrl: string } | { success: false; error: string }> {
  const description = item.gherkinSteps || item.itemType === 'scenario'
    ? buildScenarioAdf(item)
    : buildSimpleAdf(item.descriptionText)

  // Clean labels: Jira labels cannot contain spaces or special chars
  const cleanLabels = (item.labels ?? [])
    .map((l) => l.replace(/^@/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase())
    .filter(Boolean)

  const body = {
    fields: {
      project: { key: projectKey },
      issuetype: { name: issueType },
      summary: item.summary,
      description,
      priority: { name: mapPriority(item.priority) },
      ...(cleanLabels.length > 0 ? { labels: cleanLabels } : {}),
    },
  }

  try {
    const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`
      try {
        const errData = await res.json() as { errors?: Record<string, string>; errorMessages?: string[] }
        const messages = [
          ...Object.values(errData.errors ?? {}),
          ...(errData.errorMessages ?? []),
        ]
        if (messages.length > 0) errorMsg = messages.join('; ')
      } catch { /* ignore */ }
      return { success: false, error: errorMsg }
    }

    const data = await res.json() as { key: string; self: string }
    const issueUrl = `${baseUrl}/browse/${data.key}`
    return { success: true, issueKey: data.key, issueUrl }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/$/, '')
  const email = process.env.JIRA_EMAIL
  const token = process.env.JIRA_API_TOKEN

  if (!baseUrl || !email || !token) {
    return NextResponse.json(
      { error: 'Jira credentials not configured. Add JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN to .env.local.' },
      { status: 503 }
    )
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64')

  try {
    const body = await req.json()
    const parsed = CreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { projectKey, issueType, items } = parsed.data

    // Create issues sequentially to avoid rate-limiting
    const results = []
    for (const item of items) {
      const result = await createJiraIssue(baseUrl, auth, projectKey, issueType, item)
      results.push({ summary: item.summary, itemType: item.itemType, ...result })
    }

    const successCount = results.filter((r) => r.success).length
    return NextResponse.json({ results, successCount, totalCount: items.length })
  } catch (error) {
    console.error('[jira-create] Error:', error)
    return NextResponse.json({ error: 'Failed to create Jira issues' }, { status: 500 })
  }
}
