/**
 * Vertex AI Provider — Future placeholder
 *
 * NOT currently active. Switch to this later by setting:
 *   AI_PROVIDER=vertex
 *
 * To implement:
 *   1. npm install @google-cloud/vertexai
 *   2. Set VERTEX_PROJECT_ID, VERTEX_LOCATION, VERTEX_MODEL, GOOGLE_APPLICATION_CREDENTIALS in .env.local
 *   3. Replace the constructor and methods below with real Vertex AI calls
 *   4. Follow the same pattern as lib/providers/gemini.ts (build prompt → call model → Zod parse)
 */

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

export class VertexProvider implements AIProvider {
  constructor() {
    throw new Error(
      '[VertexProvider] Not yet implemented.\n' +
      'Set AI_PROVIDER=gemini to use the active Gemini provider, or AI_PROVIDER=mock for demo mode.'
    )
  }

  async generateTestDesign(_input: TestDesignInput): Promise<TestDesignOutput> {
    throw new Error('Not implemented — see lib/providers/vertex.ts')
  }

  async generateAutomationDraft(_input: AutomationInput): Promise<AutomationOutput> {
    throw new Error('Not implemented — see lib/providers/vertex.ts')
  }

  async analyzeFailure(_input: FailureAnalysisInput): Promise<FailureAnalysisOutput> {
    throw new Error('Not implemented — see lib/providers/vertex.ts')
  }

  async analyzeArchitecture(_input: ArchitectureInput): Promise<ArchitectureOutput> {
    throw new Error('Not implemented — see lib/providers/vertex.ts')
  }
}
