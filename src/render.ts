import type { PromotionBrief } from "./types.js";

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderMarkdown(brief: PromotionBrief): string {
  const title = brief.name ? `# Promotion brief: ${brief.name}` : "# Promotion brief";
  const lines = [
    title,
    "",
    `- **Promotion:** ${brief.promotionId}`,
    ...(brief.source === undefined ? [] : [`- **Source:** ${brief.source}`]),
    ...(brief.target === undefined ? [] : [`- **Target:** ${brief.target}`]),
    `- **Verdict:** **${brief.verdict.toUpperCase()}**`,
    `- **Risk score:** ${brief.riskScore}`,
    `- **Summary:** ${brief.summary}`,
    "",
    "## Evidence",
    "",
  ];

  if (brief.flags.length === 0) {
    lines.push("No risk flags.");
  } else {
    lines.push(
      "| Severity | Rule | Component | Evidence | Why it matters |",
      "|---|---|---|---|---|",
    );
    for (const flag of brief.flags) {
      lines.push(
        `| ${flag.severity.toUpperCase()} | ${cell(flag.ruleId)} | ${cell(`${flag.componentType}: ${flag.component}`)} | ${cell(flag.evidence)} | ${cell(flag.whyItMatters)} |`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}
