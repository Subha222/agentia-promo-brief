---
name: promo-brief
description: Review a Salesforce promotion snapshot for deployment risks and return an evidence-backed go, review, or hold verdict.
---

# Promotion readiness brief

Use this skill before approving or executing a promotion. A `hold` verdict means
do not proceed without resolving the high-risk findings. A `review` verdict
requires a human to inspect the evidence. Never treat missing test data as a
passing test run.

## Procedure

1. Obtain a promotion snapshot as JSON. It must include a `promotionId` and
   `components` array. Each component has a `type` and `name`; `action` and
   `active` are recommended. Supply `tests.status`, `tests.failed`, and other
   available test counts when available.
2. Run `promo-brief --input <snapshot.json> --format json`.
3. Read the complete output. Check `verdict`, `riskScore`, and every flag's
   `ruleId`, `component`, `evidence`, and `whyItMatters`.
4. If the verdict is `hold`, stop and report the blocking evidence to the
   responsible human. Do not promote.
5. If the verdict is `review`, request human approval before promotion.
6. If the verdict is `go`, report that the configured checks found no risk
   flags. This is not a guarantee of safety; follow the organization's normal
   release approvals.

## Output contract

The command emits JSON with `schemaVersion`, `promotionId`, `verdict`,
`riskScore`, `summary`, and `flags`. Every flag cites a rule, component, direct
evidence, and why the evidence matters. Do not suppress or paraphrase away
blocking findings.
