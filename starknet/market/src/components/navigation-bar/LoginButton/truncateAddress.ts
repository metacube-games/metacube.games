export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.slice(-4)}`;
}
