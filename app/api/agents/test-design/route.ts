/**
 * API Route — POST /api/agents/test-design
 *
 * This is the HTTP entry point for the Test Design Agent. It receives a
 * JSON request body from the browser, validates it, delegates to the agent
 * service, and returns the generated record.
 *
 * ACADEMIC REQUIREMENT — Input and Output:
 *   This route demonstrates the full input/output cycle:
 *   - INPUT:  the request body is parsed and validated against
 *             TestDesignInputSchema (storyText, acceptanceCriteria, optional notes)
 *   - OUTPUT: a TestDesignRecord containing the AI-generated scenarios,
 *             Gherkin steps, edge cases, risk tags, and governance metadata
 *             is returned as a JSON response
 *
 * ACADEMIC REQUIREMENT — Error Handling:
 *   Three distinct error handling mechanisms are demonstrated here:
 *
 *   1. Validation error (400) — Zod's safeParse() returns a structured list
 *      of field-level errors if the request body is malformed. These are
 *      returned directly to the client so the UI can display which fields
 *      failed and why, without throwing an exception.
 *
 *   2. Runtime error (500) — the outer try/catch handles unexpected failures
 *      (e.g. file system errors, AI provider failures) and returns a clean
 *      500 response rather than exposing an internal stack trace to the client.
 *
 *   3. Directory bootstrap — ensureDirectories() is called at the start of
 *      every request to guarantee the /data directory structure exists before
 *      any write is attempted. This prevents first-run failures on a fresh
 *      installation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { TestDesignInputSchema } from '@/lib/schemas'
import { runTestDesignAgent } from '@/lib/services/agents/test-design'
import { ensureDirectories } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    // Ensure all required /data subdirectories exist before attempting any writes
    ensureDirectories()

    // Parse the raw request body — req.json() returns unknown, not a typed object
    const body = await req.json()

    // Validate the body against the Zod schema. safeParse() does not throw;
    // it returns { success: true, data } or { success: false, error }.
    const parsed = TestDesignInputSchema.safeParse(body)

    if (!parsed.success) {
      // Return structured field-level validation errors to the client (HTTP 400)
      // flatten().fieldErrors produces an object keyed by field name, e.g.:
      // { storyText: ['Story text must be at least 10 characters'] }
      return NextResponse.json(
        { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // parsed.data is now fully typed as TestDesignInput — safe to pass downstream
    const actor = process.env.NEXT_PUBLIC_MOCK_USER ?? 'qe.engineer@bank.internal'
    const record = await runTestDesignAgent(parsed.data, actor)

    // Return the generated record — the UI uses this to display the output
    // and navigate the engineer to the review page
    return NextResponse.json({ success: true, record })

  } catch (error) {
    // Catch-all for unexpected runtime errors (file system, AI provider, etc.)
    // Logs the full error server-side while returning a clean message to the client
    console.error('[test-design] Error:', error)
    return NextResponse.json({ error: 'Failed to generate test design' }, { status: 500 })
  }
}
