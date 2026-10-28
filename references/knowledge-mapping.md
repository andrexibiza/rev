# Reference: Knowledge Mapping — What a Review Is

Normative. Source: Introduction to Code Review (Axl Ibiza, free course, 16 chapters) + worked Hermes reviews cited therein. Advanced depth: Masterclass / Code Review as Knowledge Mapping (27 chapters) — this file teaches the operational subset Rev executes.

## 1. Definition (Ch.1)

A review examines a proposed change and the reasons to accept, revise, or investigate further. Reviewer may be engineer, agent, or coordinated combination. Merely describing changed lines finishes nothing. Producing polished opinion finishes nothing.

A review is a contribution to the repository's knowledge. It connects stated purpose to implementation and consequences. Four legitimate outcomes, all valuable: (a) change is sound within stated scope; (b) conflict between intended and actual behavior; (c) requirement never settled, exposed; (d) apparent problem is harmless in the relevant path, explained. Inventing an objection to look busy destroys (a). Refusing to conclude destroys decision value.

Knowledge Mapping claim: every substantive review sentence concerns a relationship. Function preserves value. Adapter passes setting. Test checks outcome. Contributor implemented repair. The verb is the claim. Reviewers write verbs they can evidence. "Seems risky" has no verb-object pair and is banned as finding text.

Scope discipline: one adapter's result does not guarantee every surface. Focused persistence result does not establish all restart behavior. Conclusions are expressed at established strength, then the important remaining boundary is named. That is a decision, not an apology.

## 2. Why agent systems force this discipline (Ch.2)

Stateful agents continue across turns, restarts, representations (stored -> loaded -> prepared -> provider-facing). User expectations are product promises: task remains the task; workspace describes work; accepted message remains processable; tool outcome distinguished from intent; resumed conversation retains decision-necessary info. Each crosses functions/processes. Review translates expectations into engineering questions with objects: which context survives which continuation? Does removed identifier carry info a later participant needs? What survives between two lifetimes?

Cost of poor review is attention theft: unsupported comments force investigation of unestablished claims; repeated mechanism reports obscure original findings; suggested repairs remove legitimate capability; large summaries bury the one observation that matters. Value metric (binding for Rev verdicts): what can another participant now understand, inspect, decide, or repair because of this review? Count that. Never count comments or severity words.

Agent evidence rule: agent that executed a relevant check produced evidence. Agent that independently challenged a premise can expose error. Agent that repeats an unsupported conclusion produced another unsupported conclusion. Tool label is uninformative; work + artifact decide.

## 3. Language of a real PR (Ch.3) — objects Rev must never conflate

Branch (movable name) vs commit (immutable version) vs diff (between two selected versions) vs review submission (assessment at a point) vs check (run with command/inputs/assertions). PR number is stable while branch moves: historical review truth does not describe today's head. Pinned permalink answers historical questions; live branch answers navigation. Approval/request-changes are permission-system acts; resolved thread is discussion state — none executes a missing check.

Checks: green means run accepted its assertions. Red means run did not complete. Relevance requires inspecting what ran and what failed (behavior vs environment vs setup). Badges are starting points, never explanations.

Real anchor: PR #132365 title promises update ownership across whole tree. Title gives starting question. Only implementation + review evidence establishes whether every participant honors the rule.

Read prior discussion before adding findings. Contributor explanations, prior discoveries, published repairs change what useful participation is. Join the actual conversation at the actual source.

## 4. Promise before patch (Ch.4)

Read proposal + linked issue first: reported experience, replacement behavior, included boundaries. Title is shorthand; body may narrow promise. Never silently expand author responsibility to every nearby problem.

Disambiguate promise verbs before judging code: "preserve context" (visible text? workspace? system-prompt inputs?), "same workspace" (spelling? resolved location? physical dir?), "exclusive update" (start exclusion? whole-effect ownership?). Useful question names unresolved object and gives author something answerable. If sources already answer it, incorporate and move on — permanent uncertainty is performance, not rigor.

Worked case #130909 (compaction summary cache prefix, review at 8069537): producer distinction survived first reload but vanished from intermediate history used by later persistence cycle. Lesson Rev encodes as check: "first reload correct" != "distinction survives required lifetime." Every preservation finding must state required lifetime (turns, restarts, cycles) and evidence must cover that lifetime.

Guard: reviewer preference is not product policy. Simplification is valuable only if simpler source still fulfills promise. Legitimate narrow changes stay narrow; broader opportunities are filed separately with relevance explained.

## 5. Revision inside the question (Ch.5)

Pin exact head+base, keep both fixed until bounded assessment completes. Attach observations to versions: "At rev X, path drops distinction." Repairs during review start a separate re-review whose base is previously reviewed head. Base selection controls attribution: behavior compared against tree already containing unrelated changes is misattributed. Pre-existing problems found en route keep value + origin without dumping ownership on current author. Old broad results never outrank focused current results automatically; every receipt names artifact + selection actually run. Agent failure mode to block: loading moving branch while writing about pinned review, or summarizing old counts as current.

## 6. Patch is a window, not the whole room (Ch.6)

Diff locates edits; meaning lives in surroundings: unchanged callers, stored records from older versions, desktop readers of CLI-written state, provider representations prepared steps away. Scope follows proposed behavior, not census ambition: displayed-message fix needs small surroundings; workspace-identity change needs identity producers/consumers; update-ownership promise needs all participants acting in claimed interval.

Worked case #124787 (workspace pin key -> resolved path, re-review at 4a90a34): captured workspace bytes distinguished from identity recorded alongside them; repaired cases credited; remaining ownership/capture-time questions kept open. Lesson: two valid-looking values can fail to describe the same thing at the time the system needs them. Rev must name each object (referent, snapshot, stored claim) and evidence the relation among them.

Representation trap (agent systems): text agent sees may be representation of file/conversation/config/tool result. Representation stays well-formed after source connection changes. Field exists without intended meaning. Label familiar while object moved. Review interrogates connections because later decisions depend on them. Unseen consumer = reason to investigate or state limitation, never evidence of failure. Local correctness of edited function never settles relational promise alone. Untouched legitimate behavior (aliases, supported paths) is inside scope: removing capability to kill one uncertain case can make software worse.

Beginner procedure (Rev analyst lane): name edited object -> name promise it participates in -> identify next relationship needed -> if bounded and clear, say so; if material part unresolved, name it precisely.

## 7. Shared explanation, not pile of reactions (Ch.7)

Map in prose first: contributor wants distinction to survive; transformation handles it; later participant depends on it; reviewer observation concerns the connection; observation supports limited conclusion. Separate purpose (should happen) / implementation (artifact) / observation (inspected or executed) / interpretation (meaning for purpose). Blurring roles makes evidence unauditable. Hermes lifetimes make this concrete: message as received vs agent input vs stored vs replayed are different stages; evidence about one lifetime never answers another.

Include disagreement in the map: author-supplied caller, second reviewer state, adversarial control defeating attractive explanation — record changed premise + updated conclusion. Do not preserve first confident story as winner. Strong comments are short: observed condition + source relationship + consequence for promise. Review body connects comments to one underlying obligation. Summarization is engineering: summaries must preserve relationships, credit, qualifications. Absorbing prior contributions into fresh fluent summary is a defect class.

Finding taxonomy (binding output forms): Question (info needed), Finding (established conflict with promise), Suggestion (improvement, present code not defective), Assessment (supported scope + remaining open). All four may coexist. Author must never need to decode preference disguised as requirement.

## 8. Know what you know; evidence kinds (Ch.8–9)

Publication responsibility: state per conclusion — inspected source, executed behavior, contributor-reported, user-reported, design explanation, unresolved proposal. Credit supplier. Corrections becoming regression checks/source records let next session inherit improved system, not conversation memory.

Evidence strengths (Ch.9): source inspection proves code facts at inspected revision; reaching + later-participant behavior needs more. Executed check proves observation under actual artifact/env/inputs/substitutions/assertions; name+description locate intent, implemented assertion decides acceptance. Ask of every artifact: does this result establish the particular operation the surrounding sentence claims?

Worked case #126167 (prompt pins across synthetic turns, review at cebeaef4): implementation repair separated from regression test sensitivity — later human turn supplied state before durable assertion, so pass did not establish earlier protected write. Also credited z1gon/ehz0ah fixture finding separately. Rev encodes: check can see desired state while another operation supplied it; always ask what observation distinguishes. (Full treatment in references/bad-tests.md.)

Contributor results keep attribution (broad author selection vs focused reviewer execution answer different questions). User reports supply real consequence questions without identifying cause; dismissing for lack of tidy test discards the problem; treating as cause-proof misleads. Logs show scheduling, not later execution; screenshots show setting, not provider receipt. Negative results scope visibly: no-match search proves surface searched; green selection proves scenarios exercised. Neither proves "no defect exists."

Blindness (AGMD/Ch.8): producer explanation reproduces its own mistaken premise; independent challenge + mechanical checks have different jobs; agent agreement alone never guarantees truth (shared assumptions). Moved-collector case: collector moved, existing test patched old dependency location, test green while intended arrangement-connection was gone; adversarial reviewer caught it. Rev witness lanes exist to catch exactly this.

## 9. Responsible conclusions (Ch.10)

End with decision next participant can act on: behavior supported (named scope), demonstrated defect remains, material requirement unresolved, or evidence insufficient for a claim. Supported conclusions name behavior+scope (one path's context property != all lifetimes). Findings require conflict + supported consequence; observed absence without meaning/reach is a question, not a defect. Unresolved requirement (e.g., preserve identity vs fresh authoritative input) is exposed for owner decision — reviewer never silently picks requirement and presents as code repair. Evidence gap != demonstrated failure; missing native execution neither proves defect nor harmlessness.

Severity vs confidence are different axes: consequential-if-true does not make uncertain path certain; well-established minor issue does not become severe via detailed prose. Credit sound behavior (repair preserving legitimate ordinary behavior) to distinguish repair from capability-removing redesign. Technical recommendation stays separate from repo formal action; maintainer retains merge authority (see authority.md §7).

## 10. Small edit, large promise; preserve capability (Ch.11–12)

Diff size never measures behavioral promise: field passing through representations, ownership rule across languages/processes. Ask: who/what must rely on this result for proposed behavior to work? Worked case #132365 re-review (at 0e53955): ownership promise followed across update, recovery, child lifetimes, Desktop reader; newly correct producer alone could not establish protocol when another participant interpreted/mutated shared state differently. Feature names are labels; intended common behavior vs deliberate platform difference must be asked explicitly. Proportionate boundaries: single-reader fix never advertises universal ownership guarantee.

Preserve capability: repair disabling intended feature to satisfy narrow assertion fails user need. Distinctions Rev must keep available: synthetic continuation vs fresh authoritative input; persisted representation vs provider-facing content; workspace alias as legitimate same-project access; accepted message owed despite later events. Flattening replaces defect with quieter capability loss. Preference never becomes prohibition smuggled as finding; removing capability is a design recommendation labeled as such. Successful behavior informs suspicion: documented guard, admission rule excluding reachability, existing owner component — finding that explanation, withdrawing/narrowing concern, recording soundness are first-class contributions. Audits whose correct output is verified no-bypass / no patch are successes (AGMD §3), never manufactured work.

## 11. Re-review; people; humility (Ch.13–15)

Re-review the changed artifact as new bounded assessment (base = previously reviewed head). Sequence stays legible: observation -> correction -> changed artifact -> updated assessment. People are part of technical record: comments persist, get searched, get retrieved by agents as context; unsupported allegation becomes false system explanation when summaries drop evidence limits; repaired historical problem mistaken for current defect when conclusion never updated. Update conclusions; preserve credit exactly (including public handles).

Mature outcomes include: no defect found; question routed to requirement owner; agent evidence decisive while human summary adds little; independent challenge rejecting appealing explanation. Quality = advancement of project understanding, not preferred narrative. Learn system without pretending to know everything: name inspected participants vs suspected ones; automation value comes from established relationships, not inventory size.

## 12. Rev output contract (derived)

Every Rev review must contain: pinned head/base; promise sentence; map (participants + seams + lifetimes); per-finding form (Question/Finding/Suggestion/Assessment) with File:Line, severity, confidence basis (source/executed/reported), scope equality statement; sound-behavior credit; remaining boundaries; verdict (APPROVE/REQUEST_CHANGES/COMMENT) separated from merge authority; receipts enabling third-party reproduction. Missing any element = incomplete review, settled FAILED with reason, never padded with plausible prose.

## 13. Industry operating envelope (why lanes chunk work)

Empirical review science constrains human and lane design identically: defect detection degrades beyond ~400 LOC per sitting; 200–400 LOC over 60–90 min yields 70–90% detection in Cisco/SmartBear data; >500 LOC/hr collapses density; >60 min continuous review degrades. Microsoft (1.5M comments): useful-comment proportion falls as file count rises; reviewer usefulness jumps in year one then plateaus (assign by familiarity, not seniority theater). Bacchelli & Bird: reviews deliver knowledge transfer/awareness/alternatives beyond defect-finding; misunderstanding the change is the bottleneck — hence map-before-verdict. Krutauz replication: review activity metrics alone do not predict post-release defects (prior defects, size, authorship dominate) — hence Rev measures escaped defects + verified outcomes, never velocity theater. Security comments are empirically rare in general review (614/20,995 OpenStack/Qt) — hence dedicated security hat with probes.

Lane translation: analysts chunk by region/window (golden hash per window); witnesses get bounded regions, not whole-repo dumps; adjudicators see pairs, not crowds; verdicts state sitting scope. Plugin shows chunk boundaries so humans can spot-check without re-reviewing everything. Stacked PRs (GitHub native preview 2026-07-30; Graphite model) are the human-scale expression of same chunking: ordered small layers, parallel independent review per layer, one-click stack merge with auto-rebase/retarget. Rev prefers reviewing stacks layer-wise with per-layer pins; monolith PRs are decomposed virtually by window when stacking unavailable.

## 14. Review conversation protocol (multi-party, multi-agent)

Turn-taking rules that keep maps coherent under swarms: (1) Read full prior discussion + pinned artifacts before posting (duplicate mechanism reports must link original finding, not restate as new). (2) Reply in-thread for same relation; new top-level only for new relation. (3) Author response types: repair (new pin), evidence (new artifact), requirement appeal (route to owner) — each updates map explicitly ("premise changed: caller X exists, interpretation narrowed to Y"). (4) Reviewer updates own conclusions on new pin; never edit history silently. (5) Maintainer decision recorded separately from assessments with authority identity. (6) Praise at least where sincerely earned per review (morale is retention infrastructure; false praise banned, §10 authority ref). Async-first: RFC-scale changes use proposal PR + sub-team consensus (Rust RFC model) while trivial changes stay on normal path — Rev routes by radius: radius crossing subsystem ownership or public contract requires proposal object before implementation review.

Ownership routing under this protocol: CODEOWNERS auto-request is starting routing only. Rev refines by graph familiarity (who reviewed/consumed this seam before, first-year curve), load (30-day balance, Busy respected, round-robin vs load-balance declared per repo), and generation (owners resolved at base pin of PR, revalidated at merge). Routing decision + basis stored in trace (AUTHORITY span) so "why was I requested" is always answerable.

## 15. Reviewer calibration and quality control (for swarm operators)

Lane quality measured like test sensitivity: seeded-defect drills (planted bug/bad-test/ambient-spawn fixtures, rotated) must be caught at declared rates; reviewer precision tracked by developer-action outcomes (maintainer acted / dismissed with reason) — Martian-style hit definition applied internally before public benchmark. Dismissal reasons coded (wrong, stale pin, scope overclaim, preference-as-finding, duplicate) feed reference updates: repeated dismissal class = reference defect, fixed via curriculum delta (blind-witness §12), not prompt nagging.

Human-AI division that preserves trust: lanes do census, probes, sensitivity, scope bookkeeping at scale; humans own requirement decisions, risk acceptance, merge/release authority, and final call on contested interpretations. Presenting lane output as human judgment (or vice versa) misattributes authority — receipts keep producer kinds distinct (agent lane, human reviewer, maintainer) forever.

Review debt: unanswered QUESTIONs age in ledger; PRs merged with open questions carry them as linked debt (owner + expiry), visible in registry. Silent expiry forbidden (Law 5).

## 16. RFC-scale routing (when review becomes design governance)

Signals to route proposal-first (Rust RFC pattern): public contract change, cross-subsystem ownership change, new authority edge kind, data model with migration irreversibility, protocol/federation change. Proposal object: problem, options with radius/cost, invariants, migration, dissent recorded. Implementation PRs link proposal generation; reviewing implementation against unaccepted proposal capped at COMMENT. Trivial/bugfix/docs stay normal path — governance proportionality is itself reviewed (over-governing small changes destroys throughput trust).

Decision records (ADR/proposal) enter knowledge graph as Promise nodes with owner + generation; superseded decisions SUPERSEDES-linked, never deleted (accounting). Rev diagrammer renders decision lineage on request.

## 17. Knowledge graph as review memory (compounding)

Every settled review writes graph deltas: new seams discovered, test distinguishers proven insensitive (marked), radius corrections, owner changes. Next review on same seam starts from witnessed map, not zero — but map at old generation is coordinate; deltas revalidated at new pin (stale map authority = ambient violation in knowledge form). Registry query "what do we know about this seam" returns findings history with pins + updated conclusions chain. Contradictions between historical finding and current map adjudicated explicitly (SUPERSEDES), never overwritten.

Curriculum loop: repeated finding classes across repos promote to gallery + reference sections (federated learning without sharing private code: patterns + sanitized cases only, grants scoped).

## 18. Writing findings humans act on (acceptance engineering)

Acted-on findings share: exact location, broken relation in plain words before jargon, consequence for user/promise (not just code), minimal distinguishing evidence visible without rerunning everything, repair obligation bounded (property, not redesign), tone via labels (praise/question/suggestion carry collaboration). Dismissal-coded feedback improves templates quarterly.

Length discipline: finding body scannable in 30s, depth in linked receipts. Wall-of-text findings bury obligation (Ch.7) — composer enforces sections, adjudicator rejects prose blobs without tuples even when technically correct (unactionable correctness still fails review mission: decision advancement).
