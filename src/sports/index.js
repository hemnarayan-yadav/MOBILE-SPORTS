// Sport UI registry, the app's counterpart of backend/src/sports/index.js.
// Shared screens (match centre, cards) call getSportUI(match.sport) for anything
// that depends on the sport's rules; adding Cricket means adding one entry here
// and a sports/cricket/ folder, without touching the shared screens.
import { kabaddiUI } from './kabaddi/index.js';

export const DEFAULT_SPORT = 'kabaddi';

const REGISTRY = Object.freeze({ kabaddi: kabaddiUI });

// An unknown sport (a newer server than this app) falls back to the default
// rather than crashing the screen; the scores and names still show correctly.
export function getSportUI(sport = DEFAULT_SPORT) {
  return REGISTRY[sport] ?? REGISTRY[DEFAULT_SPORT];
}
