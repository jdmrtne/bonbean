export function formatMoney(amount: number, currencySymbol: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const formatted = rounded.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currencySymbol}${formatted}`;
}
