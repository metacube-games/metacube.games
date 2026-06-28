export const STRK_DECIMALS = 18;
export const WEI_PER_STRK = 10 ** STRK_DECIMALS;

/**
 * Converts a price string (in STRK) to wei (as a BigInt string).
 * Handles decimal values by converting to smallest unit.
 */
export function priceToWei(
  price: string | number,
  decimals: number = STRK_DECIMALS,
): string {
  const priceValue = typeof price === "string" ? Number(price) : price;
  return BigInt(Math.floor(priceValue * 10 ** decimals)).toString();
}

/**
 * Converts a wei value (BigInt string) to price string.
 */
export function weiToPrice(
  wei: string,
  decimals: number = STRK_DECIMALS,
): string {
  return (Number(wei) / 10 ** decimals).toString();
}

/**
 * Formats a STRK amount with a fixed number of decimals and locale thousands
 * separators. Used to render STRK balances and confirmation totals.
 * For listing-price display (compact, scientific for ≥100k), use `formatPrice`
 * from `@/utils/format` instead.
 */
export function formatStrkAmount(
  amount: string | number,
  decimals: number = 2,
): string {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
