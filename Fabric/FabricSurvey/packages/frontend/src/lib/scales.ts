import type { Choice } from '@/components/choice-scale';

export const FIVE_POINT: readonly Choice<number>[] = [1, 2, 3, 4, 5].map((n) => ({
  value: n,
  label: String(n),
}));

function npsBand(n: number): string {
  if (n <= 6) return 'border-detractor bg-detractor text-white';
  if (n <= 8) return 'border-passive bg-passive text-white';
  return 'border-promoter bg-promoter text-white';
}

export const NPS_SCALE: readonly Choice<number>[] = Array.from({ length: 11 }, (_, n) => ({
  value: n,
  label: String(n),
  selectedClassName: npsBand(n),
}));
