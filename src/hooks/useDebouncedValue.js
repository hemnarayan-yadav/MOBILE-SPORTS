// Ported from frontend/src/hooks/useDebouncedValue.js (unchanged).
import { useEffect, useState } from 'react';

const DEFAULT_DELAY_MS = 300;

export function useDebouncedValue(value, delayMs = DEFAULT_DELAY_MS) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
