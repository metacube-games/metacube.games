export const getIsDesktop = () =>
  !window.matchMedia("(pointer: coarse)").matches;
