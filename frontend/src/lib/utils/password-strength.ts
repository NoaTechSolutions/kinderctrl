export type StrengthLevel = 'empty' | 'weak' | 'medium' | 'strong';

export interface StrengthResult {
  level: StrengthLevel;
  score: number;
  fill: number;
  checks: {
    length: boolean;
    upper: boolean;
    number: boolean;
  };
}

export function calculatePasswordStrength(password: string): StrengthResult {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const long = password.length >= 10;

  let level: StrengthLevel;
  if (score === 0) level = 'empty';
  else if (score <= 1) level = 'weak';
  else if (score === 2) level = 'medium';
  else if (long) level = 'strong';
  else level = 'medium';

  const fill =
    level === 'empty' ? 0 : level === 'weak' ? 33 : level === 'medium' ? 66 : 100;

  return { level, score, fill, checks };
}
