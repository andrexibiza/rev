# Rev Schema — Knowledge Graph + GraphQL Contract

Version: 0.1.0 (hackathon freeze candidate). Status: normative for implementation.
Companion: `plan.md` (7-day build), `agents.md` (build rules). Canon: All Gods Must Die; Introduction to Code Review; Blind Witness Engine; Nothing Ambient Survives (#93943 / #95028).

## 1. Purpose

This document defines two coupled schemas:

1. **Knowledge graph schema** — the persistent, SHA-pinned graph Rev builds automatically for every repo it touches.
2. **GraphQL schema** — the only platform contract. Plugin, CLI, agent profile, and GitHub projector consume the same schema. No REST shadow API. No static JSON dumps as product surface.

GitHub is source material. This schema is the platform.

## 2. Invariants (Nothing Ambient Survives)

- Coordinates select; proof objects authorize. Every query that could reveal non-public data and every mutation requires a current `ProofObject` or a narrower derived token.
- Authority narrows monotonically: `sourceContext >= dispatch >= lane >= implementation >= review >= mergeCandidate`. No edge widens.
- Everything consequential is pinned: `sha` (commit), `generation` (authority/policy/graph generation), `policyHash`. A cached value without generation is a coordinate, never a grant.
- No actor certifies itself. Producer fields and verifier fields are disjoint. Acceptance requires an independent verifier receipt.
- Settlement is typed and terminal-or-indeterminate only. Timeout after possible side effect settles `INDETERMINATE` and must reconcile, never blind-retry.
- Receipts are value-free: identities, hashes, key names, reason codes. Never secret values, never raw environment dumps.
- SHIPPED (PRs delivered) != MERGED (merge commit verified on `main`). Both are distinct receipt states.

## 3. Identifiers and pinning

| ID type | Form | Meaning |
|---|---|---|
| `RepoId` | `rev:repo:<host>:<owner>/<name>` | Logical repo across hosts. Host is adapter, not identity. |
| `CommitSha` | 40-hex (SHA-1) or 64-hex (SHA-256) string | Immutable source pin. Branches never appear as pins. |
| `Generation` | opaque string, monotonic per repo | Authority + policy + graph generation. Changes on CODEOWNERS, protection, policy, or graph rebuild that affects authority. |
| `WorkEventId` | ULID | Immutable queued work identity. Idempotency anchor. |
| `ReceiptId` | ULID | Settlement receipt identity. |
| `SpanId` | hex trace span ID | Lane/execution/authority trace span. |
| `TraceId` | hex trace ID | One end-to-end run (review, fix, or crisis response). |
| `GraphNodeId` | `rev:node:<kind>:<repo-scoped-key>` | Stable within a generation; remapped explicitly across generations. |

All GraphQL fields that return source-derived data accept `at: PinInput` (`sha`, `generation`). Omitting `at` means "latest verified generation" and the response must echo the resolved pin. Responses never silently float to a newer pin mid-request.

Pagination is Relay-style (`first/after`, `last/before`) on every list. No unbounded lists.

## 4. Knowledge graph model

### 4.1 Node kinds

- `Repository` — logical repo. Owns authority maps, policies, graph generations.
- `Promise` — stated intended behavior from PR/issue/advisory/docs. Has `statement`, `sourceRef`, `ownerPrincipal`.
- `CodeEntity` — file, module, function, class, route, migration, workflow. Has `path`, `span`, `language`, `contentHash`.
- `Consumer` — a CodeEntity or external actor that depends on another CodeEntity. Materialized as edge, indexed as node for query speed.
- `Seam` — boundary where unchanged code can change behavior (representation change, persistence cycle, provider boundary, process boundary).
- `TestAssertion` — what a test actually asserts (parsed assertion), distinct from test name. Linked to CodeEntities it exercises and to seams it covers.
- `AuthorityHolder` — principal (user, team, app installation) with resolved grants at a generation.
- `Advisory` — OSV-normalized vulnerability record. Source IDs (CVE/GHSA) are coordinates stored as aliases.
- `Finding` — review conclusion at a pin: conflict, question, suggestion, or verified-sound note. Carries severity + blocking disposition.
- `Repair` — candidate change addressing a Finding or Advisory. Links to PR when projected.
- `PullRequestProjection` — GitHub PR as projection of Rev work. Not source of truth. Stores host, number, head/base SHAs.
- `Receipt` — settlement receipt (see 5.6). First-class node; findings and merges are proven by receipts.
- `LaneRun` — one blind lane execution (analyst, witness, adjudicator, implementer, reviewer). Holds input hashes, output artifact refs, verdict.
- `Trace` / `Span` — see Section 7.

### 4.2 Edge kinds (directed, typed, evidenced)

Every edge carries `evidence: [EvidenceRef!]!`, `at: Pin!`, `generation`. Edges without evidence cannot support a Finding above `QUESTION`.

- `PROMISES` Promise -> CodeEntity (intended scope)
- `IMPLEMENTS` Repair -> Promise (claims to fulfill)
- `CONSUMES` CodeEntity -> CodeEntity (call/import/data dependency)
- `CROSSES` CodeEntity -> Seam -> CodeEntity (behavior crosses a boundary)
- `ASSERTS` TestAssertion -> CodeEntity; `COVERS_SEAM` TestAssertion -> Seam
- `OWNS` AuthorityHolder -> CodeEntity (path-pattern resolved, per generation)
- `AFFECTS` Advisory -> CodeEntity (version-range match); `REACHES` Advisory -> CodeEntity (reachability-proven path; distinct from AFFECTS)
- `REPORTS` LaneRun -> Finding; `ADDRESSES` Repair -> Finding|Advisory
- `REVIEWS` LaneRun -> Repair (fresh review only; producer lane cannot review own output)
- `PROJECTS_TO` Repair|Finding -> PullRequestProjection
- `SETTLES` Receipt -> (WorkEvent|Repair|Merge)
- `SUPERSEDES` GraphNode -> GraphNode across generations (explicit remap; never inferred)

### 4.3 Build rules

Graph is built automatically from ingestion: source AST, lockfiles/SBOM/Dockerfiles/workflow pins, PR/issue text, review history, settlement receipts. Manual edits are proposals (new Promise nodes), never direct graph writes. Rebuild creates a new generation; prior generations remain queryable. Reachability (`REACHES`) requires an executed or statically proven path artifact; version match alone only creates `AFFECTS`.

## 5. GraphQL schema (SDL)

Conventions: `Pin` echoes resolved `sha + generation + policyHash` on every payload. Lists are Relay connections. `Refusal` is data, not a transport error: mutations return a union of success payload or `RefusalPayload`. GraphQL errors are reserved for malformed requests and auth failures before proof validation.

### 5.1 Scalars and inputs

```graphql
scalar CommitSha
scalar Generation
scalar PolicyHash
scalar DateTime
scalar JSON

input PinInput { sha: CommitSha, generation: Generation }

type Pin {
  sha: CommitSha!
  generation: Generation!
  policyHash: PolicyHash!
  resolvedAt: DateTime!
}

input ProofInput {
  authorityId: ID!
  parentAuthorityId: ID
  sourceInstallationId: String!
  targetInstallationId: String
  principalId: String!
  operation: OperationKind!
  policyVersion: String!
  policyHash: PolicyHash!
  grants: [String!]!
  stdinPolicy: StdinPolicy!
  descendantPolicy: DescendantPolicy!
  leaseToken: String
  generation: Generation!
  issuedAt: DateTime!
  expiresAt: DateTime!
  payloadDigest: String!
}
```

### 5.2 Enums

```graphql
enum OperationKind { REVIEW FIX IMPLEMENT DIAGRAM AUDIT_TESTS RESPOND TRIAGE MERGE }
enum StdinPolicy { CLOSED EMPTY_FROM_INPUT INHERIT_FORBIDDEN }
enum DescendantPolicy { NONE SAME_PROFILE_ONLY EXPLICIT_GRANTS_ONLY }
enum Severity { CRITICAL WARNING SUGGESTION }
enum Disposition { BLOCKING NIT QUESTION VERIFIED_SOUND }
enum FindingKind { DEFECT SECURITY BAD_TEST REGRESSION CONTRACT PERFORMANCE RELIABILITY DATA API UX ACCESSIBILITY SUPPLY_CHAIN RELEASE OBSERVABILITY DOCS_PARITY ML_SYSTEMS REQUIREMENT }
enum SettlementState { QUEUED CLAIMED RUNNING COMPLETED FAILED CANCELLED EXPIRED INDETERMINATE SHIPPED MERGED NO_ACTION }
enum Verdict { APPROVE REQUEST_CHANGES COMMENT }
enum LaneKind { ANALYST WITNESS ADJUDICATOR IMPLEMENTER REVIEWER_CORRECTNESS REVIEWER_ADVERSARIAL TRIAGE EXECUTOR }
enum SpanKind { AUTHORITY LANE EXECUTION }
enum AdvisoryEcosystem { PYPI NPM CRATES GO RUBYGEMS MAVEN NUGET PACKAGIST HEX DOCKER GITHUB_ACTIONS DISTRO }
```

### 5.3 Core graph types

```graphql
interface Node { id: ID! }

type Repository implements Node {
  id: ID!
  host: String!
  owner: String!
  name: String!
  defaultBranch: String!
  pin: Pin!
  authorityMap: AuthorityMap!
  promises(first: Int, after: String, at: PinInput): PromiseConnection!
  codeEntities(first: Int, after: String, at: PinInput, pathPrefix: String): CodeEntityConnection!
  findings(first: Int, after: String, at: PinInput, disposition: Disposition): FindingConnection!
  advisories(first: Int, after: String, reachableOnly: Boolean): AdvisoryConnection!
  workEvents(first: Int, after: String, state: SettlementState): WorkEventConnection!
  knowledgeGraph(at: PinInput): KnowledgeGraph!
}

type Promise implements Node {
  id: ID!
  statement: String!
  sourceRef: String!
  ownerPrincipalId: String
  codeEntities(first: Int, after: String): CodeEntityConnection!
  findings(first: Int, after: String): FindingConnection!
}

type CodeEntity implements Node {
  id: ID!
  path: String!
  spanStart: Int
  spanEnd: Int
  language: String
  contentHash: String!
  consumers(first: Int, after: String, at: PinInput): CodeEntityConnection!
  tests(first: Int, after: String): TestAssertionConnection!
  owners(at: PinInput): [AuthorityHolder!]!
  advisories(first: Int, after: String): AdvisoryConnection!
}

type TestAssertion implements Node {
  id: ID!
  testPath: String!
  testName: String!
  assertionText: String!
  exercises: [CodeEntity!]!
  coversSeams: [Seam!]!
  canGoRed: Boolean
}

type Seam implements Node {
  id: ID!
  kind: String!
  description: String!
  left: CodeEntity!
  right: CodeEntity!
}

type KnowledgeGraph {
  pin: Pin!
  nodeCount: Int!
  edgeCount: Int!
  nodes(first: Int, after: String, kinds: [String!]): GraphNodeConnection!
  path(fromId: ID!, toId: ID!, at: PinInput): [GraphEdge!]!
  blastRadius(entityId: ID!, at: PinInput, depth: Int): [CodeEntity!]!
}

type GraphEdge {
  kind: String!
  fromId: ID!
  toId: ID!
  evidence: [EvidenceRef!]!
  pin: Pin!
}

type EvidenceRef {
  kind: String!
  ref: String!
  digest: String
  pin: Pin!
}
```

### 5.4 Authority, work, findings, advisories

```graphql
type AuthorityHolder implements Node {
  id: ID!
  principalId: String!
  kind: String!
  grants: [String!]!
}

type AuthorityMap {
  pin: Pin!
  codeownersPath: String
  holders: [AuthorityHolder!]!
  requiredApprovals: Int!
  mergeHolders: [AuthorityHolder!]!
  ambiguous: Boolean!
  refusalReason: String
}

type WorkEvent implements Node {
  id: ID!
  operation: OperationKind!
  state: SettlementState!
  pin: Pin!
  proofDigest: String!
  idempotencyKey: String!
  trace: Trace!
  receipt: Receipt
  findings(first: Int, after: String): FindingConnection!
  repairs(first: Int, after: String): RepairConnection!
}

type Finding implements Node {
  id: ID!
  kind: FindingKind!
  severity: Severity!
  disposition: Disposition!
  filePath: String
  line: Int
  title: String!
  body: String!
  evidence: [EvidenceRef!]!
  evidenceBasis: String!
  verdict: Verdict
  repairs(first: Int, after: String): RepairConnection!
  pin: Pin!
}

type Repair implements Node {
  id: ID!
  title: String!
  state: SettlementState!
  headSha: CommitSha
  baseSha: CommitSha
  projection: PullRequestProjection
  findings(first: Int, after: String): FindingConnection!
  laneRuns(first: Int, after: String): LaneRunConnection!
  receipt: Receipt
}

type PullRequestProjection implements Node {
  id: ID!
  host: String!
  number: Int!
  url: String!
  headSha: CommitSha!
  baseSha: CommitSha!
}

type Advisory implements Node {
  id: ID!
  osvId: String!
  aliases: [String!]!
  ecosystem: AdvisoryEcosystem!
  packageName: String!
  summary: String!
  publishedAt: DateTime!
  knownExploited: Boolean!
  affectedEntities(first: Int, after: String, at: PinInput): CodeEntityConnection!
  reachableEntities(first: Int, after: String, at: PinInput): CodeEntityConnection!
  reachabilityPath(at: PinInput): [GraphEdge!]!
}
```

### 5.5 Lanes, traces, receipts, refusals

```graphql
type LaneRun implements Node {
  id: ID!
  kind: LaneKind!
  state: SettlementState!
  inputDigests: [String!]!
  outputDigest: String
  verdict: Verdict
  startedAt: DateTime!
  endedAt: DateTime
  span: Span!
}

type Trace implements Node {
  id: ID!
  workEvent: WorkEvent!
  spans(first: Int, after: String, kind: SpanKind): SpanConnection!
}

type Span implements Node {
  id: ID!
  traceId: String!
  kind: SpanKind!
  name: String!
  startedAt: DateTime!
  endedAt: DateTime
  pin: Pin!
  attributes: JSON!
}

type Receipt implements Node {
  id: ID!
  state: SettlementState!
  reasonCode: String!
  outcomeDigest: String!
  pin: Pin!
  mergeSha: CommitSha
  createdAt: DateTime!
}

type RefusalPayload {
  reasonCode: String!
  message: String!
  pin: Pin
  retryable: Boolean!
}
```

Connections: for each `T` in {Promise, CodeEntity, TestAssertion, Finding, Repair, WorkEvent, Advisory, LaneRun, Span, GraphNode}, `TConnection { edges: [{ cursor, node: T }], pageInfo }` follows Relay. `GraphNode` is a union of all node kinds for graph-wide queries. Implementations must generate these types; they are not hand-optional.

## 6. Queries (read path)

All queries accept an optional proof context via HTTP header or `proof` argument where data is non-public. Public demo reads may use a repo-scoped read token whose grants are echoed in `Pin.policyHash` lineage. No query widens beyond its proof grants.

```graphql
type Query {
  node(id: ID!): Node
  repository(id: ID!, at: PinInput): Repository
  repositories(first: Int, after: String): RepositoryConnection!
  workEvent(id: ID!): WorkEvent
  advisory(osvId: String!): Advisory
  advisories(first: Int, after: String, ecosystem: AdvisoryEcosystem, reachableOnly: Boolean): AdvisoryConnection!
  trace(id: ID!): Trace
  registry(first: Int, after: String, filter: RegistryFilterInput): WorkEventConnection!
}

input RegistryFilterInput {
  repoId: ID
  state: SettlementState
  advisoryId: ID
  findingKind: FindingKind
  awaitingMaintainer: Boolean
}
```

Required single-round-trip triage query (plugin must use this, not N+1 REST):

```graphql
query Triage($repo: ID!, $adv: String!, $at: PinInput) {
  repository(id: $repo, at: $at) {
    pin { sha generation policyHash }
    authorityMap { ambiguous mergeHolders { principalId } }
  }
  advisory(osvId: $adv) {
    reachableEntities(first: 20) { edges { node { path owners { principalId } } } }
    reachabilityPath(at: $at) { kind fromId toId }
  }
}
```

## 7. Mutations (command path) and subscriptions

Mutations are commands. Each consumes `proof: ProofInput!`, builds or validates the proof object server-side, and returns a payload union with `RefusalPayload`. No mutation accepts a bare repo/PR/branch string as authority. Idempotency key is required; replay returns the original `WorkEvent` and receipt.

```graphql
type Mutation {
  enqueueReview(input: EnqueueReviewInput!): EnqueuePayload!
  requestFix(input: RequestFixInput!): EnqueuePayload!
  requestImplement(input: RequestImplementInput!): EnqueuePayload!
  respondToAdvisory(input: RespondInput!): EnqueuePayload!
  requestDiagram(input: RequestDiagramInput!): EnqueuePayload!
  auditTests(input: AuditTestsInput!): EnqueuePayload!
  recordMaintainerMerge(input: RecordMergeInput!): RecordMergePayload!
  reconcileIndeterminate(input: ReconcileInput!): ReconcilePayload!
}

input EnqueueReviewInput { repoId: ID!, headSha: CommitSha!, baseSha: CommitSha!, idempotencyKey: String!, proof: ProofInput! }
input RequestFixInput { findingId: ID!, repoId: ID!, idempotencyKey: String!, proof: ProofInput! }
input RequestImplementInput { repoId: ID!, promiseText: String!, baseSha: CommitSha!, idempotencyKey: String!, proof: ProofInput! }
input RespondInput { repoId: ID!, osvId: String!, idempotencyKey: String!, proof: ProofInput! }
input RequestDiagramInput { repoId: ID!, entityId: ID, at: PinInput, idempotencyKey: String!, proof: ProofInput! }
input AuditTestsInput { repoId: ID!, headSha: CommitSha!, baseSha: CommitSha!, idempotencyKey: String!, proof: ProofInput! }
input RecordMergeInput { repairId: ID!, mergeSha: CommitSha!, proof: ProofInput! }
input ReconcileInput { workEventId: ID!, observedMainSha: CommitSha!, proof: ProofInput! }

type EnqueuePayload { workEvent: WorkEvent, refusal: RefusalPayload }
type RecordMergePayload { receipt: Receipt, refusal: RefusalPayload }
type ReconcilePayload { receipt: Receipt, refusal: RefusalPayload }

type Subscription {
  laneSpanAdded(traceId: ID!): Span!
  settlementChanged(repoId: ID): WorkEvent!
  graphGenerationChanged(repoId: ID!): Pin!
}
```

Subscription auth uses the same proof grants as the underlying query. Spans stream states and artifact digests only. Chain-of-thought is never a field, never an attribute, never streamed.

## 8. Traces

Three span kinds share one `Trace` per `WorkEvent`:

- `AUTHORITY` — admission, projection, mutation, settlement checkpoints. Attributes: `authorityId`, `policyHash`, `generation`, `reasonCode` on refusal.
- `LANE` — one span per LaneRun. Attributes: `laneKind`, `inputDigests`, `outputDigest`, `verdict`. Analyst and witness spans for the same region must show disjoint input digests for witness reasoning (information isolation is auditable).
- `EXECUTION` — tests, probes, child processes. Attributes: `argvDigest`, `envKeyNames` (names only), `stdinPolicy`, `exitObservation` (observed, never treated as proof alone).

Trace retention follows repo policy. Receipt digests outlive span payloads: a receipt must remain verifiable after spans expire.

## 9. Errors and refusals

- Transport/auth errors (bad signature, expired token before proof validation): GraphQL `errors` with `extensions.code` in {`UNAUTHENTICATED`, `BAD_REQUEST`}.
- Authority refusals (stale generation, ambiguous CODEOWNERS, policy-hash mismatch, grant too narrow, widening attempt): success HTTP with `refusal { reasonCode, retryable }`. Reason codes are stable strings, versioned with this schema. Examples: `PROOF_STALE_GENERATION`, `AUTHORITY_AMBIGUOUS`, `POLICY_HASH_MISMATCH`, `GRANT_TOO_NARROW`, `AUTHORITY_WIDENING`, `PIN_MOVED`, `INDETERMINATE_RECONCILE_REQUIRED`.
- `INDETERMINATE` is a settlement, not an error. Clients must surface it and offer reconcile, never auto-retry the mutation.

## 10. Versioning and implementation order

GraphQL schema evolves additively within `0.x`: new fields and enum values allowed; removing/renaming is breaking and requires `schemaVersion` bump plus persisted-query migration. Persisted queries for plugin/CLI/App are registered by hash; ad-hoc queries allowed in dev only.

Build order binding to `plan.md`: Day 2 lands `Repository`, `Pin`, `AuthorityMap`, `WorkEvent`, `Receipt`, queue mutations with refusals. Day 3 adds `Finding`, `LaneRun`, `Trace/Span`, graph path queries. Day 5 adds `Advisory` reachability + `respondToAdvisory` + `recordMaintainerMerge`. Day 6 adds `registry` filters + subscriptions for plugin. No surface may bypass GraphQL to read the graph store directly.


## Appendix A — Emitted Relay types (normative, fixes REV-REVIEW B2)

```graphql
type PageInfo { hasNextPage: Boolean!, hasPreviousPage: Boolean!, startCursor: String, endCursor: String }

union GraphNode = Repository | Promise | CodeEntity | TestAssertion | Seam | AuthorityHolder | WorkEvent | Finding | Repair | PullRequestProjection | Advisory | LaneRun | Trace | Span | Receipt

type RepositoryEdge { cursor: String!, node: Repository! }
type RepositoryConnection { edges: [RepositoryEdge!]!, pageInfo: PageInfo! }
type PromiseEdge { cursor: String!, node: Promise! }
type PromiseConnection { edges: [PromiseEdge!]!, pageInfo: PageInfo! }
type CodeEntityEdge { cursor: String!, node: CodeEntity! }
type CodeEntityConnection { edges: [CodeEntityEdge!]!, pageInfo: PageInfo! }
type TestAssertionEdge { cursor: String!, node: TestAssertion! }
type TestAssertionConnection { edges: [TestAssertionEdge!]!, pageInfo: PageInfo! }
type FindingEdge { cursor: String!, node: Finding! }
type FindingConnection { edges: [FindingEdge!]!, pageInfo: PageInfo! }
type RepairEdge { cursor: String!, node: Repair! }
type RepairConnection { edges: [RepairEdge!]!, pageInfo: PageInfo! }
type WorkEventEdge { cursor: String!, node: WorkEvent! }
type WorkEventConnection { edges: [WorkEventEdge!]!, pageInfo: PageInfo! }
type AdvisoryEdge { cursor: String!, node: Advisory! }
type AdvisoryConnection { edges: [AdvisoryEdge!]!, pageInfo: PageInfo! }
type LaneRunEdge { cursor: String!, node: LaneRun! }
type LaneRunConnection { edges: [LaneRunEdge!]!, pageInfo: PageInfo! }
type SpanEdge { cursor: String!, node: Span! }
type SpanConnection { edges: [SpanEdge!]!, pageInfo: PageInfo! }
type GraphNodeEdge { cursor: String!, node: GraphNode! }
type GraphNodeConnection { edges: [GraphNodeEdge!]!, pageInfo: PageInfo! }
```

Referenced-type closure is now complete for Query/Repository/Promise/CodeEntity/WorkEvent/Finding/Repair/Advisory/Trace fields. Seam and AuthorityHolder intentionally have no Connection (bounded lists only) — any future field returning them in bulk must add Connection types in the same change.
