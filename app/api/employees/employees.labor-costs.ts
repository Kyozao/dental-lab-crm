export type DecimalLike = { toString(): string } | number | string | null | undefined;

export function decimalToString(value: DecimalLike, fallback = "0.00") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const numeric =
    typeof value === "number" ? value : Number(value.toString());

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return numeric.toFixed(2);
}

export function resolveEffectiveLaborCost(options: {
  defaultLaborCost: DecimalLike;
  laborCostOverride: DecimalLike;
}) {
  return decimalToString(
    options.laborCostOverride ?? options.defaultLaborCost,
  );
}
