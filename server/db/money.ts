const NUMERIC_PATTERN = /^(-)?(\d+)(?:\.(\d{1,}))?$/;

/**
 * Converts a PostgreSQL NUMERIC (returned as text) into integer minor units
 * without ever passing through IEEE-754 floating point.
 * Fractions beyond two digits must be zero; otherwise the value is rejected
 * rather than silently rounded.
 */
export const numericToCents = (value: unknown, label = 'monetary value'): number => {
  const match = NUMERIC_PATTERN.exec(String(value).trim());
  if (!match) throw new Error(`Invalid ${label}.`);
  const [, sign, whole, fraction = ''] = match;
  if (/[1-9]/.test(fraction.slice(2))) throw new Error(`Invalid ${label}: more than two decimal places.`);
  const cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${label} exceeds safe monetary range.`);
  return sign ? -Number(cents) : Number(cents);
};
