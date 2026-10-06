#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createBrief } from "./analyze.js";
import { parsePromotion } from "./input.js";
import { renderMarkdown } from "./render.js";
import { loadRules } from "./rules.js";

const help = `Usage: promo-brief --input <promotion.json> [options]

Create an explainable deployment readiness brief from a promotion snapshot.

Options:
  --input <path>       Promotion snapshot JSON (required)
  --rules <path>       YAML rules file (default: rules/default.yml)
  --format <format>    markdown or json (default: markdown)
  --out <path>         Write output to a file instead of stdout
  --help               Show this help
`;

interface CliOptions {
  input: string;
  rules: string;
  format: "markdown" | "json";
  out?: string;
}

function parseArgs(args: string[]): CliOptions | "help" {
  let input: string | undefined;
  let rules = "rules/default.yml";
  let format: CliOptions["format"] = "markdown";
  let out: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") return "help";
    if (arg !== "--input" && arg !== "--rules" && arg !== "--format" && arg !== "--out") {
      throw new Error(`Unknown option "${arg}". Use --help for usage.`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Option "${arg}" requires a value.`);
    }
    index += 1;
    if (arg === "--input") input = value;
    else if (arg === "--rules") rules = value;
    else if (arg === "--out") out = value;
    else if (value === "markdown" || value === "json") format = value;
    else throw new Error(`Unsupported format "${value}". Choose "markdown" or "json".`);
  }

  if (input === undefined) throw new Error('Missing required "--input" option.');
  return { input, rules, format, ...(out === undefined ? {} : { out }) };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options === "help") {
    process.stdout.write(help);
    return;
  }

  const inputPath = resolve(options.input);
  const rulesPath = resolve(options.rules);
  const promotionData: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const promotion = parsePromotion(promotionData);
  const rules = await loadRules(rulesPath);
  const brief = createBrief(promotion, rules);
  const output =
    options.format === "json"
      ? `${JSON.stringify(brief, null, 2)}\n`
      : renderMarkdown(brief);

  if (options.out === undefined) {
    process.stdout.write(output);
  } else {
    await writeFile(resolve(options.out), output, "utf8");
    process.stderr.write(`Wrote ${options.format} brief to ${resolve(options.out)}\n`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`promo-brief: ${message}\n`);
  process.exitCode = 1;
});
