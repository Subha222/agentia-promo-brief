# Agentia Promo Brief

An explainable, agent-friendly promotion readiness CLI. It inspects a promotion
snapshot and produces a `go`, `review`, or `hold` verdict with rule IDs,
component-level evidence, and human-readable reasoning.

> **MVP integration boundary:** This version consumes a normalized JSON
> snapshot. It does not call undocumented Agentia or Copado APIs. Connect an
> official API/CLI exporter to the input contract once its supported fields and
> authentication flow have been verified.

## Requirements

- Node.js 20+
- npm

## Install and run

```sh
npm install
npm run build
node dist/src/cli.js --input sample/promotion.json
node dist/src/cli.js --input sample/promotion.json --format json
```

During development, use `npm start -- --input sample/promotion.json`.

Pass `--rules rules/default.yml` to select a rules file. Use `--out brief.md`
or `--out brief.json` to save the selected format. The command reports errors
to stderr and exits non-zero for invalid input or configuration.

## Snapshot input

```json
{
  "promotionId": "PROMO-1042",
  "name": "Customer onboarding updates",
  "source": "UAT",
  "target": "Production",
  "components": [
    { "type": "ApexClass", "name": "OnboardingService", "action": "modified" },
    { "type": "ApexClass", "name": "OnboardingServiceTest", "action": "added" },
    { "type": "Flow", "name": "Customer_Onboarding", "active": true },
    { "type": "PermissionSet", "name": "Customer_Success_Access" }
  ],
  "tests": { "status": "passed", "passed": 128, "failed": 0, "total": 128 }
}
```

`tests` may be omitted when results are unavailable; that produces a review
flag, not a pass. Apex tests are associated by the conventional `<ClassName>Test`
name or an explicit `testsFor` list on a test component. Actions such as
`delete`, `deleted`, `remove`, and `removed` trigger the destructive-change
rule.

## Default checks

| Rule | Default severity | What it flags |
|---|---|---|
| `destructive-change` | critical | Metadata with a delete/remove action |
| `permission-change` | high | Profile, permission set, or permission set group |
| `active-flow-change` | medium | A Flow component marked active |
| `apex-without-test` | high | Apex class without a matching test class |
| `test-not-ready` | critical | Failed test count or a non-passing test status |
| `test-results-missing` | medium | No test execution data supplied |

Severity and weight are configurable. By default, any critical/high flag or
risk score of 8+ yields `hold`; remaining flags yield `review`; no flags yields
`go`. See [rules/default.yml](rules/default.yml) for the full sample schema.
Weights sum into `riskScore`; severity lists and score thresholds determine
the verdict.

## Agent skill

The portable skill instructions are in
[skills/promo-brief/SKILL.md](skills/promo-brief/SKILL.md). After installing
the CLI and exposing it on the agent's PATH, register that skill using the
Agentia skill/plugin installation mechanism supported by your Agentia version.
This repository deliberately avoids inventing an unsupported plugin manifest.

## Development

```sh
npm test
npm run build
```

The JSON output uses `schemaVersion: "1"` and is intended as the stable
machine-readable contract. Markdown is intended for human review.
