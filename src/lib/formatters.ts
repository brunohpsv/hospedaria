/**
 * Formatters for Brazilian Portuguese currency and numeric values.
 * Formats numbers strictly as X,XX (e.g., 220,00 or R$ 220,00).
 */

export function formatCurrency(
  value: number | string | undefined | null,
  includeSymbol: boolean = true
): string {
  if (value === undefined || value === null || value === '') {
    return includeSymbol ? 'R$ 0,00' : '0,00';
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (isNaN(num)) {
    return includeSymbol ? 'R$ 0,00' : '0,00';
  }

  const formatted = num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return includeSymbol ? `R$ ${formatted}` : formatted;
}

export function formatNumber2Decimals(value: number | string | undefined | null): string {
  return formatCurrency(value, false);
}

export function parseCurrencyInput(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const clean = value.replace(/[^\d.,-]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
