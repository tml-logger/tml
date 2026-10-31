const cache = new Map<string, RegExp>();

function escapeRegex(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

export function compilePattern(pattern: string): RegExp {
  const cached = cache.get(pattern);
  if (cached) {
    return cached;
  }

  if (!pattern) {
    throw new TypeError('TML watch pattern must be a non-empty string');
  }

  const source = pattern
    .split('*')
    .map(escapeRegex)
    .join('.*');

  const compiled = new RegExp(`^${source}$`);
  cache.set(pattern, compiled);
  return compiled;
}

export function matchesPattern(scope: string, pattern: string): boolean {
  return compilePattern(pattern).test(scope);
}

export function matchesAnyPattern(scope: string, patterns: Iterable<string>): boolean {
  for (const pattern of patterns) {
    if (matchesPattern(scope, pattern)) {
      return true;
    }
  }
  return false;
}
