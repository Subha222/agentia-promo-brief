import type {
  BriefFlag,
  Promotion,
  PromotionBrief,
  PromotionComponent,
  RulesConfig,
  Severity,
  TestResults,
} from "./types.js";

function setting(rules: RulesConfig, id: string) {
  const value = rules.rules[id];
  if (!value) throw new Error(`No configuration found for rule "${id}".`);
  return value;
}

function componentFlag(
  rules: RulesConfig,
  id: string,
  component: PromotionComponent,
  evidence: string,
  whyItMatters: string,
): BriefFlag | undefined {
  const config = setting(rules, id);
  if (!config.enabled) return undefined;
  return {
    ruleId: id,
    severity: config.severity,
    weight: config.weight,
    component: component.name,
    componentType: component.type,
    evidence,
    whyItMatters,
  };
}

function isDestructive(action: string | undefined): boolean {
  return action !== undefined && /^(delete|deleted|remove|removed|destroy|destroyed)$/i.test(action.trim());
}

function normalizedType(type: string): string {
  return type.toLowerCase().replace(/[\s_-]/g, "");
}

function isApexClass(component: PromotionComponent): boolean {
  return normalizedType(component.type) === "apexclass";
}

function isTestClass(component: PromotionComponent): boolean {
  return normalizedType(component.type) === "apextestclass" || /test$/i.test(component.name);
}

function testIsReady(tests: TestResults): boolean {
  if (tests.status !== undefined) {
    return /^(passed|pass|success|succeeded)$/i.test(tests.status.trim());
  }
  return (
    tests.passed !== undefined &&
    tests.failed === 0 &&
    tests.total !== undefined &&
    tests.total > 0 &&
    tests.passed === tests.total
  );
}

function hasUsableTestResult(tests: TestResults): boolean {
  return (
    (tests.status !== undefined && tests.status.trim() !== "") ||
    (tests.passed !== undefined && tests.failed !== undefined && tests.total !== undefined)
  );
}

function severityMatches(severity: Severity, configured: Severity[]): boolean {
  return configured.includes(severity);
}

export function createBrief(promotion: Promotion, rules: RulesConfig): PromotionBrief {
  const flags: BriefFlag[] = [];

  for (const component of promotion.components) {
    if (isDestructive(component.action)) {
      const flag = componentFlag(
        rules,
        "destructive-change",
        component,
        `Action is "${component.action}".`,
        "Deleting metadata can remove production behavior or configuration and may be difficult to reverse.",
      );
      if (flag) flags.push(flag);
    }

    const type = normalizedType(component.type);
    if (type === "profile" || type === "permissionset" || type === "permissionsetgroup") {
      const flag = componentFlag(
        rules,
        "permission-change",
        component,
        `Permission-bearing metadata of type "${component.type}" is included.`,
        "Access-control changes can grant unintended privileges or disrupt users.",
      );
      if (flag) flags.push(flag);
    }

    if (type === "flow" && component.active === true) {
      const flag = componentFlag(
        rules,
        "active-flow-change",
        component,
        `Flow is marked active and has action "${component.action ?? "unspecified"}".`,
        "An active automation change can alter live record processing and user-facing behavior.",
      );
      if (flag) flags.push(flag);
    }
  }

  const apexClasses = promotion.components.filter(
    (component) => isApexClass(component) && !isTestClass(component),
  );
  for (const apexClass of apexClasses) {
    const hasTest = promotion.components.some((component) => {
      if (!isTestClass(component)) return false;
      return (
        component.name.toLowerCase() === `${apexClass.name}test`.toLowerCase() ||
        component.testsFor?.some((name) => name.toLowerCase() === apexClass.name.toLowerCase()) === true
      );
    });
    if (!hasTest) {
      const flag = componentFlag(
        rules,
        "apex-without-test",
        apexClass,
        `No matching test class named "${apexClass.name}Test" or explicit testsFor association is in the promotion.`,
        "Untested Apex increases the chance of regressions and can block a Salesforce deployment.",
      );
      if (flag) flags.push(flag);
    }
  }

  if (promotion.tests === undefined || !hasUsableTestResult(promotion.tests)) {
    const config = setting(rules, "test-results-missing");
    if (config.enabled) {
      flags.push({
        ruleId: "test-results-missing",
        severity: config.severity,
        weight: config.weight,
        component: "Promotion test run",
        componentType: "TestResults",
        evidence:
          promotion.tests === undefined
            ? "No test execution data was supplied."
            : "Test execution data is incomplete; status or passed, failed, and total counts are required.",
        whyItMatters: "Without test results, readiness cannot be confirmed; verify the CI or org test run before promotion.",
      });
    }
  } else if (
    !testIsReady(promotion.tests)
  ) {
    const config = setting(rules, "test-not-ready");
    if (config.enabled) {
      const evidence = [
        promotion.tests.status === undefined ? undefined : `status "${promotion.tests.status}"`,
        promotion.tests.failed === undefined ? undefined : `${promotion.tests.failed} failed`,
        promotion.tests.passed === undefined ? undefined : `${promotion.tests.passed} passed`,
        promotion.tests.total === undefined ? undefined : `${promotion.tests.total} total`,
      ].filter((part) => part !== undefined).join(", ");
      flags.push({
        ruleId: "test-not-ready",
        severity: config.severity,
        weight: config.weight,
        component: "Promotion test run",
        componentType: "TestResults",
        evidence: evidence || "Test run is not marked as passed.",
        whyItMatters: "A failed or incomplete test run is a direct signal that the promotion may break existing behavior.",
      });
    }
  }

  const riskScore = flags.reduce((score, flag) => score + flag.weight, 0);
  const hasHoldSeverity = flags.some((flag) => severityMatches(flag.severity, rules.holdOn));
  const hasReviewSeverity = flags.some((flag) => severityMatches(flag.severity, rules.reviewOn));
  const verdict =
    hasHoldSeverity || riskScore >= rules.holdScore
      ? "hold"
      : hasReviewSeverity || riskScore >= rules.reviewScore
        ? "review"
        : "go";
  const summary =
    verdict === "go"
      ? "No configured promotion risks were detected."
      : `${flags.length} risk ${flags.length === 1 ? "flag" : "flags"} detected; review the evidence before proceeding.`;

  return {
    schemaVersion: "1",
    promotionId: promotion.promotionId,
    ...(promotion.name === undefined ? {} : { name: promotion.name }),
    ...(promotion.source === undefined ? {} : { source: promotion.source }),
    ...(promotion.target === undefined ? {} : { target: promotion.target }),
    verdict,
    riskScore,
    summary,
    flags,
  };
}
