import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { RulesConfig, RuleSetting, Severity } from "./types.js";

const severities = new Set<Severity>(["critical", "high", "medium", "low"]);
const ruleIds = [
  "destructive-change",
  "permission-change",
  "active-flow-change",
  "apex-without-test",
  "test-not-ready",
  "test-results-missing",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSeverityList(value: unknown, key: string): Severity[] {
  if (!Array.isArray(value) || !value.every((item) => severities.has(item as Severity))) {
    throw new Error(`Rules config "${key}" must be a list of critical, high, medium, or low.`);
  }
  return value as Severity[];
}

function parseSetting(id: string, value: unknown): RuleSetting {
  if (!isRecord(value)) throw new Error(`Rule "${id}" must be an object.`);
  const { enabled, severity, weight } = value;
  if (typeof enabled !== "boolean") throw new Error(`Rule "${id}" needs a boolean "enabled".`);
  if (typeof severity !== "string" || !severities.has(severity as Severity)) {
    throw new Error(`Rule "${id}" has an invalid severity.`);
  }
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
    throw new Error(`Rule "${id}" needs a non-negative numeric "weight".`);
  }
  return { enabled, severity: severity as Severity, weight };
}

export async function loadRules(path: string): Promise<RulesConfig> {
  const text = await readFile(path, "utf8");
  const parsed: unknown = parse(text);
  if (!isRecord(parsed)) throw new Error("Rules config must be a YAML object.");
  const { holdScore, reviewScore, holdOn, reviewOn, rules } = parsed;
  if (
    typeof holdScore !== "number" ||
    !Number.isFinite(holdScore) ||
    holdScore < 0 ||
    typeof reviewScore !== "number" ||
    !Number.isFinite(reviewScore) ||
    reviewScore < 0
  ) {
    throw new Error('"Rules config needs non-negative "holdScore" and "reviewScore".');
  }
  if (!isRecord(rules)) throw new Error('Rules config must include a "rules" mapping.');

  const settings: Record<string, RuleSetting> = {};
  for (const id of ruleIds) {
    if (!(id in rules)) throw new Error(`Rules config is missing rule "${id}".`);
    settings[id] = parseSetting(id, rules[id]);
  }
  for (const id of Object.keys(rules)) {
    if (!ruleIds.includes(id as (typeof ruleIds)[number])) {
      throw new Error(`Rules config contains unknown rule "${id}".`);
    }
  }

  return {
    holdScore,
    reviewScore,
    holdOn: parseSeverityList(holdOn, "holdOn"),
    reviewOn: parseSeverityList(reviewOn, "reviewOn"),
    rules: settings,
  };
}
