/**
 * Formats a price for display:
 * - Integers: no decimals; decimals: up to 2 significant places
 * - ≥ 100,000: scientific notation (10^x)
 * - Thousands separators (comma)
 *
 * `naFallback` should be translated before passing.
 */
export function formatPrice(
  price: number | string | undefined,
  naFallback: string = "N/A",
): string {
  if (price === undefined) return naFallback;

  const numPrice = typeof price === "string" ? Number(price) : price;

  if (numPrice >= 100000) {
    const exponent = Math.floor(Math.log10(numPrice));
    const mantissa = numPrice / Math.pow(10, exponent);
    const formattedMantissa = mantissa.toFixed(2).replace(/\.?0+$/, "");
    return `${formattedMantissa}×10^${exponent}`;
  }

  const formattedValue =
    numPrice % 1 === 0
      ? numPrice.toString()
      : numPrice.toFixed(2).replace(/\.?0+$/, "");

  return formattedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
