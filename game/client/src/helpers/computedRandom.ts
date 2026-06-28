const randoms = Array.from({ length: 2000 }, () => Math.random());
let i = 0;
export function getNextRandom() {
  const val = randoms[i] as number;
  i = (i + 1) % randoms.length;
  return val;
}
