export type Severity = "critical" | "high" | "medium" | "low";
export type Verdict = "go" | "review" | "hold";

export interface PromotionComponent {
  type: string;
  name: string;
  action?: string;
  active?: boolean;
  testsFor?: string[];
}

export interface TestResults {
  status?: string;
  passed?: number;
  failed?: number;
  total?: number;
}

export interface Promotion {
  promotionId: string;
  name?: string;
  source?: string;
  target?: string;
  components: PromotionComponent[];
  tests?: TestResults;
}

export interface RuleSetting {
  enabled: boolean;
  severity: Severity;
  weight: number;
}

export interface RulesConfig {
  holdScore: number;
  reviewScore: number;
  holdOn: Severity[];
  reviewOn: Severity[];
  rules: Record<string, RuleSetting>;
}

export interface BriefFlag {
  ruleId: string;
  severity: Severity;
  weight: number;
  component: string;
  componentType: string;
  evidence: string;
  whyItMatters: string;
}

export interface PromotionBrief {
  schemaVersion: "1";
  promotionId: string;
  name?: string;
  source?: string;
  target?: string;
  verdict: Verdict;
  riskScore: number;
  summary: string;
  flags: BriefFlag[];
}
