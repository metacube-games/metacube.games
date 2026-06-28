/** Returns the squared distance between two 3D points (skips the sqrt — caller decides). */
export function distanceSqV3(
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
): number {
  const x = x2 - x1;
  const y = y2 - y1;
  const z = z2 - z1;
  return x * x + y * y + z * z;
}
