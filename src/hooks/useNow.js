// Ported from frontend/src/hooks/useNow.js (unchanged).
import { useEffect, useState } from 'react';

// Re-renders on an interval while `enabled`, for clocks and countdowns.
export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, enabled]);

  return now;
}
