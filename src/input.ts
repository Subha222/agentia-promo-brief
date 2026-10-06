import type {
  Promotion,
  PromotionComponent,
  TestResults,
} from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`Expected "${key}" to be a string.`);
  return value;
}

function parseComponent(value: unknown, index: number): PromotionComponent {
  if (!isRecord(value)) throw new Error(`Component at index ${index} must be an object.`);
  const { type, name, action, active, testsFor } = value;

  if (typeof type !== "string" || type.trim() === "") {
    throw new Error(`Component at index ${index} must have a non-empty "type".`);
  }
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(`Component at index ${index} must have a non-empty "name".`);
  }
  if (action !== undefined && typeof action !== "string") {
    throw new Error(`Component "${name}" has a non-string "action".`);
  }
  if (active !== undefined && typeof active !== "boolean") {
    throw new Error(`Component "${name}" has a non-boolean "active" value.`);
  }
  if (
    testsFor !== undefined &&
    (!Array.isArray(testsFor) || !testsFor.every((item) => typeof item === "string"))
  ) {
    throw new Error(`Component "${name}" has an invalid "testsFor" list.`);
  }

  return {
    type,
    name,
    ...(action === undefined ? {} : { action }),
    ...(active === undefined ? {} : { active }),
    ...(testsFor === undefined ? {} : { testsFor }),
  };
}

function parseTests(value: unknown): TestResults | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error('"tests" must be an object.');

  const tests: TestResults = {};
  const status = optionalString(value, "status");
  if (status !== undefined) tests.status = status;

  for (const key of ["passed", "failed", "total"] as const) {
    const count = value[key];
    if (count !== undefined) {
      if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
        throw new Error(`"tests.${key}" must be a non-negative integer.`);
      }
      tests[key] = count;
    }
  }
  return tests;
}

export function parsePromotion(value: unknown): Promotion {
  if (!isRecord(value)) throw new Error("Promotion input must be a JSON object.");
  const promotionId = optionalString(value, "promotionId");
  if (promotionId === undefined || promotionId.trim() === "") {
    throw new Error('Promotion input must include a non-empty "promotionId".');
  }
  if (!Array.isArray(value.components)) {
    throw new Error('Promotion input must include a "components" array.');
  }

  const name = optionalString(value, "name");
  const source = optionalString(value, "source");
  const target = optionalString(value, "target");
  const components = value.components.map(parseComponent);
  const tests = parseTests(value.tests);
  return {
    promotionId,
    components,
    ...(name === undefined ? {} : { name }),
    ...(source === undefined ? {} : { source }),
    ...(target === undefined ? {} : { target }),
    ...(tests === undefined ? {} : { tests }),
  };
}
