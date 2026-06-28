/**
 * Utility functions for formatting wallet / account addresses.
 */

/**
 * Truncate a wallet address for display, keeping the leading and trailing
 * characters and replacing the middle with an ellipsis.
 *
 * @param addr - The address to truncate. An empty/falsy value yields "".
 * @param left - Number of leading characters to keep (default: 6).
 * @param right - Number of trailing characters to keep (default: 4).
 * @returns The truncated address, e.g. "0x1234...cdef".
 */
export function truncateAddress(addr: string, left = 6, right = 4): string {
  if (!addr) return "";
  if (addr.length <= left + right) return addr;
  return `${addr.substring(0, left)}...${addr.slice(-right)}`;
}
