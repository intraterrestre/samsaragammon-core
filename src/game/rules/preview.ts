export function previewMove(from: number, roll: number, trackSize: number): number {
  const last = trackSize - 1;
  const target = from + roll;

  if (target <= last) return target;

  // rebote: si te pasas, vuelves hacia atrás
  const overflow = target - last;
  return Math.max(0, last - overflow);
}