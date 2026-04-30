# AI QE Control Tower

A governed AI agent platform for the Quality Engineering team within the Savings Lab at Lloyds Banking Group. Built as an academic software engineering project demonstrating advanced programming concepts including runtime validation, provider abstraction, file-based data retrieval, human-in-the-loop governance, and automated testing.

**Author:** Morrie Kamara (GitHub username: RichieRax)

---

## Table of Contents

- [Business Scenario](#business-scenario)
- [Solution Overview](#solution-overview)
- [The Four AI Agents](#the-four-ai-agents)
- [Architecture](#architecture)
- [How the Prompt Flow Works](#how-the-prompt-flow-works)
- [Retrieval Augmented Generation](#retrieval-augmented-generation)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Academic Requirements](#academic-requirements)
- [Getting Started](#getting-started)
- [Running the Tests](#running-the-tests)
- [Switching AI Providers](#switching-ai-providers)
- [Extending the Platform](#extending-the-platform)

---

## Business Scenario

**QE Savings Lab** is the Quality Engineering team within the Savings Lab at **Lloyds Banking Group**. The team is responsible for testing all software before it goes live — covering fund transfers, ISA account openings, customer onboarding, and core banking integrations.

The team faces three compounding problems:

1. **Test design is slow.** Writing test scenarios from user stories is manual, inconsistent, and ties up senior engineers who should be focused on risk analysis rather than boilerplate.

2. **Automation drafting is a bottleneck.** Translating Gherkin BDD scenarios into Playwright TypeScript code is repetitive and error-prone, especially under sprint pressure.

3. **Failure triage is expensive.** When tests fail in CI, engineers spend significant time determining whether a failure is a real product defect, a flaky timing issue, a test code problem, or an environment incident. The wrong classification leads to wasted developer time or missed regressions reaching production.

There is also a governance problem: if engineers use general-purpose AI tools such as ChatGPT without controls, there is no audit trail, no consistency, no record of what was generated or who reviewed it — unacceptable in a regulated financial services environment.

The AI QE Control Tower solves all of these by providing a controlled internal platform where AI agents assist the QE team, but every AI output must pass through a human approval workflow before it can be used.

---

## Solution Overview

The application is a full-stack web platform built on Next.js 15. Engineers interact with four AI agents through a browser-based UI. Each agent takes structured input, constructs a grounded prompt, calls an AI model, validates the output, and stores a draft record. That record then enters an approval queue where a human reviewer approves, rejects, or returns it for revision. Every state transition is logged as an immutable audit event.

**Key principle:** the AI accelerates the team but never acts autonomously. Nothing reaches the test framework without a human sign-off.

---

## The Four AI Agents

### 1. Test Design Agent

Generates a complete test design artefact from a user story.

| Input | Output |
|---|---|
| User story text | Test scenarios (with priority, type, tags) |
| Acceptance criteria | Gherkin BDD scenarios |
| Business notes *(optional)* | Edge cases and negative cases |
| Risk notes *(optional)* | Risk tags, assumptions, open questions |

The agent is grounded in UK financial services domain knowledge — it applies risk-based testing principles, uses British English, and treats financial loss, data integrity failures, and duplicate submissions as high priority.

---

### 2. Automation Agent

Generates ready-to-review Playwright TypeScript automation code from Gherkin scenarios.

| Input | Output |
|---|---|
| Gherkin BDD text | Step definitions (Given/When/Then) |
| Framework notes *(optional)* | Page Object classes with locators |
| Existing steps context *(optional)* | Implementation notes and warnings |
| Page object context *(optional)* | Locator strategy recommendations |

The agent uses `data-testid` and ARIA role locators in preference to brittle CSS selectors, and flags potential conflicts with existing framework code.

---

### 3. Failure Analysis Agent

Classifies a Playwright test failure and produces a structured triage report.

| Input | Output |
|---|---|
| Scenario name | Root cause analysis |
| Failed log | Failure category (see below) |
| Stack trace *(optional)* | Confidence level (High / Medium / Low) |
| Screenshot notes *(optional)* | Jira-ready defect note |
| Environment notes *(optional)* | Escalation guidance |

**Failure categories:** `real-defect` · `flaky` · `environment` · `test-code` · `data-issue`

---

### 4. Architecture Agent

Answers sprint-planning questions about microservice integration, database selection, and downstream dependencies.

| Input | Output |
|---|---|
| Architecture question | Structured answer |
| Services context *(optional)* | Impacted components |
| Downstream notes *(optional)* | Integration risks |
| Internal knowledge base *(optional)* | Test implications |
| | Recommended next steps |

This agent implements **Retrieval Augmented Generation (RAG)** — see the [RAG section](#retrieval-augmented-generation) below.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Next.js UI)                  │
│         Agent Forms · Approval Queue · Dashboard         │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP POST
┌───────────────────────▼─────────────────────────────────┐
│              Next.js API Routes (app/api/)               │
│         Input validated with Zod before proceeding       │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│           Agent Services (lib/services/agents/)          │
│    Orchestrates: prompt → provider → storage → audit     │
└──────────┬────────────────────────────┬─────────────────┘
           │                            │
┌──────────▼──────────┐    ┌────────────▼────────────────┐
│   Prompt Builders   │    │       AI Provider           │
│   (lib/prompts/)    │    │    (lib/providers/)          │
│                     │    │  Gemini · Mock · Vertex(wip) │
│  Pure functions     │    │  Resolved via factory at     │
│  No AI dependency   │    │  runtime from env/settings   │
└─────────────────────┘    └────────────┬────────────────┘
                                        │
┌───────────────────────────────────────▼─────────────────┐
│              Storage Layer (lib/storage/)                │
│         JSON files on disk · /data/{namespace}/          │
│   outputs/ · approvals/ · audit/ · knowledge/ · prompts/ │
└─────────────────────────────────────────────────────────┘
```

### Approval Lifecycle

Every AI output follows this state machine before it can be exported or used:

```
draft → pending-approval → approved
                        → rejected
                        → returned (sent back for revision)
```

Every transition is written as an immutable audit event, providing a tamper-evident log for compliance purposes.

---

## How the Prompt Flow Works

When an engineer submits a request, the following steps occur in sequence:

**1. Validation**
The raw HTTP request body is parsed through a Zod schema. If any field fails validation (e.g. a story text shorter than 10 characters), the request is rejected immediately with a field-level error message. The AI model is never invoked.

**2. Prompt Construction**
The validated input is passed to a prompt builder function (`lib/prompts/`). This pure TypeScript function assembles a structured string that sets the AI's domain persona, embeds the user's input via template literals, conditionally includes optional context sections, and declares the exact JSON structure the model must return — including permitted enum values.

**3. AI Call**
The prompt is passed to the active provider. The provider sends it to the model and receives a JSON response.

**4. Output Validation**
The model's response is parsed through a Zod output schema. Any deviation from the expected structure is caught before the data is stored.

**5. Storage and Audit**
The validated output is assembled into a typed record with metadata (ID, timestamp, actor, status) and written to disk. A separate audit event is logged recording what happened, who triggered it, and contextual metadata.

**6. Human Review**
The record enters the approval queue as a draft. No further action occurs until a reviewer approves it.

---

## Retrieval Augmented Generation

The Architecture Agent implements a lightweight RAG pattern.

When the engineer enables the **"Use Knowledge Base"** option, the API route reads `data/knowledge/savings-architecture.json` from disk at request time. This file contains the internal architecture of QE Savings Lab — microservices, Kafka topics, databases, API contracts, downstream dependencies, and known risks.

This document is injected into the prompt under a clearly labelled `INTERNAL KNOWLEDGE BASE` section. The model is instructed to treat it as its primary source of truth, ranked above both the engineer's supplementary context and its own general training knowledge.

The model therefore reasons over real architectural context rather than generating plausible-sounding but fabricated service names — a critical requirement in a compliance environment.

**Upgrade path:** as the knowledge base grows, the natural evolution is to chunk and embed the documents using `text-embedding-004`, store them in a vector database (Vertex AI Vector Search or Pinecone), and retrieve only the most semantically relevant chunks per question. The prompt builder interface would not need to change — only what is passed into it.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack React framework with server-side API routes |
| Language | TypeScript 5.5 | Static typing throughout all layers |
| Validation | Zod 3 | Runtime input/output validation at API boundaries |
| AI Model | Google Gemini (`@google/generative-ai`) | Live AI provider |
| UI | React 18, Tailwind CSS, Radix UI, Framer Motion | Component library and animations |
| Storage | Local JSON files (Node.js `fs`) | Zero-infrastructure data persistence |
| Testing | Vitest 4 | Fast TypeScript-native unit test runner |
| Utilities | date-fns, uuid, clsx, tailwind-merge | Date formatting, ID generation, class composition |

---

## Project Structure

```
├── app/
│   ├── api/                    # Next.js API routes (all agents + CRUD)
│   │   ├── agents/             # test-design · automation · failure-analysis · architecture
│   │   ├── approvals/          # approval queue read/write
│   │   ├── history/            # output record listing
│   │   ├── exports/            # JSON and Markdown export
│   │   ├── dashboard/          # stats aggregation
│   │   └── settings/provider/  # runtime AI provider toggle
│   └── agents/ · approvals/ · dashboard/ · history/   # UI pages
│
├── lib/
│   ├── prompts/                # Prompt builder functions (pure, no AI dependency)
│   │   ├── test-design.ts
│   │   ├── automation.ts
│   │   ├── failure-analysis.ts
│   │   └── architecture.ts
│   ├── providers/              # AI provider abstraction
│   │   ├── index.ts            # AIProvider interface + factory
│   │   ├── gemini.ts           # Google Gemini implementation
│   │   ├── mock.ts             # Demo/test mock provider
│   │   └── vertex.ts           # Vertex AI (placeholder)
│   ├── schemas/
│   │   └── index.ts            # All Zod validation schemas
│   ├── services/
│   │   ├── agents/             # Agent orchestration logic
│   │   ├── approvals/          # Approval workflow logic
│   │   ├── audit/              # Audit event logging
│   │   └── exports/            # JSON and Markdown export logic
│   ├── storage/
│   │   └── files.ts            # File-based CRUD layer
│   └── utils/
│       └── index.ts            # ID generation, date formatting, label maps
│
├── types/
│   └── index.ts                # All TypeScript interfaces and types
│
├── data/                       # Runtime data (gitignored in production)
│   ├── outputs/                # Agent output records
│   ├── approvals/              # Approval records
│   ├── audit/                  # Immutable audit events
│   └── knowledge/              # RAG knowledge base (savings-architecture.json)
│
└── __tests__/                  # Unit tests
    ├── schemas.test.ts         # Zod validation schema tests
    ├── utils.test.ts           # Utility function tests
    └── prompts.test.ts         # Prompt builder tests
```

---

## Academic Requirements

This project was built to satisfy the following code requirements:

### Input and Output
Every agent has a typed input interface and a typed output interface. Inputs are validated with Zod schemas before the agent is invoked. Outputs are validated with Zod schemas before they are stored. API routes return structured JSON responses. Prompt builders take typed input and return a structured string that declares the expected output contract.

**Key files:** `lib/schemas/index.ts` · `lib/prompts/` · `app/api/agents/`

---

### Error Handling
- `readRecord()` wraps `JSON.parse` in a try/catch and returns `null` on failure — a corrupt file does not crash the API route
- `listRecords()` silently skips individual corrupt files so one bad record does not prevent the rest of the list from loading
- Zod's `safeParse()` returns structured field-level errors without throwing — these are surfaced directly to the client
- The provider factory throws a descriptive error for unknown provider names, identifying exactly what configuration value was received
- The Gemini provider implements retry logic for 503 responses from the model API

**Key files:** `lib/storage/files.ts` · `lib/schemas/index.ts` · `lib/providers/gemini.ts`

---

### Variety in Data Structures
- `z.enum()` — typed string unions (AgentType, ItemStatus, Priority, FailureCategory, ConfidenceLevel)
- `z.object()` — structured records with required and optional fields
- `z.array()` — ordered collections of typed items (scenarios, gherkinScenarios, edgeCases)
- `Record<K, V>` — exhaustive key-value maps enforced by TypeScript (AGENT_LABELS, STATUS_LABELS)
- Generic functions — `writeRecord<T>`, `readRecord<T>`, `listRecords<T>` with type parameters
- Discriminated unions — AgentType used as a switch discriminant in `generateTitle()`
- Nested schemas — composed from smaller reusable Zod building blocks

**Key files:** `lib/schemas/index.ts` · `types/index.ts` · `lib/utils/index.ts`

---

### Data Retrieval
- `readRecord<T>(namespace, id)` — retrieves a single JSON record from disk by ID
- `listRecords<T>(namespace)` — reads all records in a namespace directory, sorts by timestamp
- `updateRecord<T>(namespace, id, updates)` — merges a partial update using object spread
- Architecture Agent RAG — reads `data/knowledge/savings-architecture.json` from disk at runtime and injects it into the prompt

**Key files:** `lib/storage/files.ts` · `app/api/agents/architecture/route.ts`

---

### Testing

86 unit tests across 3 files, run with Vitest.

| File | Tests | Coverage |
|---|---|---|
| `__tests__/schemas.test.ts` | ~38 | Zod schemas — valid inputs, rejection cases, enum values, error paths |
| `__tests__/utils.test.ts` | ~30 | Pure utility functions — ID uniqueness, date formats, truncation boundaries, slugification, label map completeness |
| `__tests__/prompts.test.ts` | ~18 | Prompt builders — input embedding, conditional sections, JSON output contract keys |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A Google Gemini API key *(or use mock mode — no key required)*

### Installation

```bash
# Clone the repository
git clone <your-repository-url>
cd ai-qe-control-tower

# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local
```

### Environment Variables

Add the following to `.env.local`:

```env
# AI Provider: gemini | mock | vertex
AI_PROVIDER=mock

# Required only when AI_PROVIDER=gemini
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-pro
```

### Running the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. On the dashboard, click **Load Demo Data** to populate the app with realistic sample records.

---

## Running the Tests

```bash
# Run all tests once
npm test

# Run in watch mode during development
npm run test:watch
```

Expected output:

```
Test Files  3 passed (3)
     Tests  86 passed (86)
```

---

## Switching AI Providers

The active provider can be changed in two ways:

**At runtime (no restart required)**
Use the provider toggle in the application settings. This writes to `data/settings/provider.json` and takes effect on the next request.

**Via environment variable**
Set `AI_PROVIDER` in `.env.local` to one of: `gemini` · `mock` · `vertex`

**Provider comparison**

| Provider | Use case | Requires |
|---|---|---|
| `mock` | Demo, development, testing | Nothing |
| `gemini` | Production with Google AI Studio | `GEMINI_API_KEY` |
| `vertex` | Production with data residency compliance | GCP service account, project ID |

To implement the Vertex provider, fill in the four methods in `lib/providers/vertex.ts` using the `@google-cloud/aiplatform` SDK. The prompts, schemas, storage, and approval workflow require no changes — only the provider implementation changes.

---

## Extending the Platform

### Adding a New Agent

1. Add the new agent type to the `AgentType` enum in `types/index.ts` and `lib/schemas/index.ts`
2. Create a prompt builder in `lib/prompts/`
3. Add input and output Zod schemas to `lib/schemas/index.ts`
4. Add the method to the `AIProvider` interface in `lib/providers/index.ts`
5. Implement the method in `GeminiProvider` and `MockProvider`
6. Create an agent service in `lib/services/agents/`
7. Add an API route in `app/api/agents/`

The approval workflow, audit logging, and storage layer require no changes.

### Upgrading the Knowledge Base to Vector Search

1. Chunk `data/knowledge/savings-architecture.json` into smaller passages
2. Embed each chunk using `text-embedding-004`
3. Store embeddings in Vertex AI Vector Search or Pinecone
4. Replace the file read in the architecture API route with a semantic similarity query
5. The `buildArchitecturePrompt()` function signature does not change

### Calling Agents Programmatically

All agents are accessible via standard HTTP POST requests, making them available from CI/CD pipelines, CLI scripts, IDE extensions, or any internal tooling:

```bash
# Example: call the Failure Analysis Agent from a CI script
curl -X POST http://localhost:3000/api/agents/failure-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "scenarioName": "Fund Transfer - Happy Path",
    "failedLog": "TimeoutError: locator.click exceeded 30000ms",
    "actor": "ci-pipeline"
  }'
```

---

## Licence

This project was created for academic submission. All code is original work by the author.


