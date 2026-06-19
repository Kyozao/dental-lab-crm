export function formatCurrency(
  value: string | number | null | undefined,
  currency: string,
) {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return "Not set";
  }

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
