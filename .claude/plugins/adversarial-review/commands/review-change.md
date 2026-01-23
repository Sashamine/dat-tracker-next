---
name: review-change
description: Run adversarial review process for a proposed data change
arguments:
  - name: ticker
    description: Company ticker symbol (e.g., MSTR, KULR)
    required: true
  - name: field
    description: Field to change (holdings, sharesOutstandingDiluted, totalDebt, cashReserves)
    required: true
  - name: value
    description: Proposed new value
    required: true
  - name: source
    description: Optional source URL hint
    required: false
---

# Adversarial Review Process

You are orchestrating a dual-agent adversarial review for a proposed data change.

## Input
- **Ticker**: $ARGUMENTS.ticker
- **Field**: $ARGUMENTS.field
- **Proposed Value**: $ARGUMENTS.value
- **Source Hint**: $ARGUMENTS.source (if provided)

## Process

### Phase 1: Proposer

Spawn the **adversarial-review:proposer** agent with this task:

```
Build a case for changing $ARGUMENTS.ticker $ARGUMENTS.field to $ARGUMENTS.value

Source hint: $ARGUMENTS.source

You must:
1. Find and verify the primary source
2. Classify the evidence tier (verified, provisional, unverified)
3. Check the existing value's provenance via git
4. Assess legitimacy if this is a press release
5. Output structured JSON per your instructions

This is for the DAT Tracker project. Data files are in:
- src/lib/data/companies.ts
- src/lib/data/holdings-history.ts
```

**Wait for Proposer to complete and capture the JSON output.**

### Phase 2: Validate Proposer Output

Check that Proposer output contains required fields:
- proposal.ticker
- proposal.field
- proposal.currentValue
- proposal.proposedValue
- evidence.tier
- evidence.sourceUrl
- evidence.exactQuote
- recommendedAction

If evidence.tier is "unverified" (TIER 3), **auto-reject**:
```
REJECTED: Evidence is TIER 3 (unverified).
Aggregators, news articles, and web searches are not acceptable as primary sources.
Find a SEC filing, company dashboard, or official press release.
```

### Phase 3: Challenger

Spawn the **adversarial-review:challenger** agent with ONLY the Proposer's JSON:

```
Review this proposed data change:

[INSERT PROPOSER JSON HERE]

You must:
1. Independently verify the source (fetch it yourself)
2. Verify the existing value's provenance
3. Validate methodology (basic/diluted, splits, currency)
4. If provisional, scrutinize the press release
5. Check against known patterns
6. Render decision: APPROVE, REJECT, REQUEST_MORE_INFO, or ESCALATE

Reference: .claude/plugins/adversarial-review/references/known-patterns.md
```

**Wait for Challenger to complete and capture the decision.**

### Phase 4: Process Decision

#### If APPROVE (approve_verified)
```
✅ APPROVED (Verified)

Change: $ticker $field
From: $currentValue
To: $proposedValue
Source: $sourceUrl (TIER 1 - Verified)

Proposer evidence: [summary]
Challenger verification: [summary]

Ready to apply. Run:
  /apply-change $ticker $field $value
```

#### If APPROVE (approve_provisional)
```
✅ APPROVED (Provisional)

Change: $ticker $field
From: $currentValue
To: $proposedValue
Source: $sourceUrl (TIER 2 - Press Release)

⚠️  This will be added with pendingVerification: true
⚠️  Expected SEC confirmation by: $verificationExpected

Proposer evidence: [summary]
Challenger verification: [summary]
Company track record: [summary]

Ready to apply with caveats. Run:
  /apply-change $ticker $field $value --provisional
```

#### If REJECT
```
❌ REJECTED

Proposed: $ticker $field → $proposedValue

Reason: $challenger.reason

Evidence needed: $challenger.evidenceNeeded

The change will NOT be applied.
```

#### If REQUEST_MORE_INFO
```
❓ MORE INFORMATION NEEDED

Proposed: $ticker $field → $proposedValue

Challenger questions:
$challenger.questions (numbered list)

Please provide answers and re-run:
  /review-change $ticker $field $value --context "answers here"
```

#### If ESCALATE
```
⚠️  ESCALATED FOR HUMAN REVIEW

Proposed: $ticker $field → $proposedValue

Reason: $challenger.reason

Conflicting sources:
$challenger.conflictingSources (formatted)

Challenger recommendation: $challenger.recommendation

Please investigate manually and decide whether to:
  /apply-change $ticker $field $value --override "reason"
  OR
  Reject the change
```

### Phase 5: Log the Review

Append to `.claude/plugins/adversarial-review/reviews.log`:

```
---
date: [timestamp]
ticker: $ticker
field: $field
currentValue: $currentValue
proposedValue: $proposedValue
evidenceTier: $tier
proposerAction: $proposer.recommendedAction
challengerDecision: $challenger.decision
outcome: [applied|rejected|escalated|pending]
---
```

## Error Handling

If Proposer fails to produce valid JSON:
```
ERROR: Proposer did not produce valid structured output.
This usually means insufficient evidence was found.
Please provide a source URL: /review-change $ticker $field $value --source URL
```

If Challenger cannot access the source:
```
ERROR: Challenger could not verify source URL.
Source may be behind paywall, require auth, or be unavailable.
Decision: ESCALATE for manual verification.
```

## Examples

### Successful verified change
```
User: /review-change MSTR holdings 471107 --source https://www.sec.gov/...

[Proposer builds case with SEC 8-K evidence]
[Challenger verifies independently]

✅ APPROVED (Verified)
Change: MSTR holdings 450000 → 471107
Source: SEC 8-K (TIER 1)
```

### Successful provisional change
```
User: /review-change KULR holdings 610

[Proposer finds press release, assesses legitimacy]
[Challenger verifies track record]

✅ APPROVED (Provisional)
Change: KULR holdings 510 → 610
Source: Press Release (TIER 2)
⚠️ pendingVerification: true
```

### Rejected change
```
User: /review-change MARA sharesOutstandingDiluted 378000000

[Proposer cites SEC but uses basic shares]
[Challenger catches basic vs diluted error]

❌ REJECTED
Reason: Value 378M is basic shares. Diluted shares are 470M per same filing.
```
