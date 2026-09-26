// Ported from frontend/src/utils/countries.js (unchanged).
//
// Dialling codes offered by the phone field. India leads the list and is the
// default: it is the platform's first market, so the common case needs no
// thought. The rest cover where Indian kabaddi players and organisers most
// often are. The API stores E.164 regardless of what is picked here.
export const DEFAULT_COUNTRY = 'IN';

export const COUNTRIES = Object.freeze([
  { code: 'IN', dial: '+91', name: 'India', flag: '🇮🇳', nationalDigits: 10 },
  { code: 'AE', dial: '+971', name: 'United Arab Emirates', flag: '🇦🇪', nationalDigits: 9 },
  { code: 'AU', dial: '+61', name: 'Australia', flag: '🇦🇺', nationalDigits: 9 },
  { code: 'BD', dial: '+880', name: 'Bangladesh', flag: '🇧🇩', nationalDigits: 10 },
  { code: 'CA', dial: '+1', name: 'Canada', flag: '🇨🇦', nationalDigits: 10 },
  { code: 'DE', dial: '+49', name: 'Germany', flag: '🇩🇪', nationalDigits: 11 },
  { code: 'IR', dial: '+98', name: 'Iran', flag: '🇮🇷', nationalDigits: 10 },
  { code: 'KE', dial: '+254', name: 'Kenya', flag: '🇰🇪', nationalDigits: 9 },
  { code: 'LK', dial: '+94', name: 'Sri Lanka', flag: '🇱🇰', nationalDigits: 9 },
  { code: 'MY', dial: '+60', name: 'Malaysia', flag: '🇲🇾', nationalDigits: 9 },
  { code: 'NP', dial: '+977', name: 'Nepal', flag: '🇳🇵', nationalDigits: 10 },
  { code: 'PK', dial: '+92', name: 'Pakistan', flag: '🇵🇰', nationalDigits: 10 },
  { code: 'QA', dial: '+974', name: 'Qatar', flag: '🇶🇦', nationalDigits: 8 },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia', flag: '🇸🇦', nationalDigits: 9 },
  { code: 'SG', dial: '+65', name: 'Singapore', flag: '🇸🇬', nationalDigits: 8 },
  { code: 'GB', dial: '+44', name: 'United Kingdom', flag: '🇬🇧', nationalDigits: 10 },
  { code: 'US', dial: '+1', name: 'United States', flag: '🇺🇸', nationalDigits: 10 },
]);

// Phone OTP is India-only, so forms that verify a number offer +91 alone.
export const OTP_COUNTRIES = Object.freeze(
  COUNTRIES.filter((country) => country.code === DEFAULT_COUNTRY),
);

export const countryByCode = (code) =>
  COUNTRIES.find((country) => country.code === code) ?? COUNTRIES[0];

// Splits a stored E.164 number back into a country and the national part, so an
// existing number can be edited in the same two controls it was entered with.
// The longest matching dialling code wins, and the first country listed for a
// shared code (+1 → Canada before the United States) is the one shown.
export function splitPhone(value) {
  const digits = String(value ?? '').replace(/[^\d+]/g, '');
  if (!digits.startsWith('+'))
    return { code: DEFAULT_COUNTRY, national: digits.replace(/\D/g, '') };

  const match = [...COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((country) => digits.startsWith(country.dial));

  if (!match) return { code: DEFAULT_COUNTRY, national: digits.slice(1) };
  return { code: match.code, national: digits.slice(match.dial.length) };
}

// "+91 9876543210" — an E.164 number as people read it.
export function formatPhone(value) {
  const { code, national } = splitPhone(value);
  return national ? `${countryByCode(code).dial} ${national}` : '';
}

// Builds the E.164 value the API stores. An empty national part yields an empty
// string rather than a bare dialling code, so "no number given" stays empty.
export function joinPhone(countryCode, national) {
  const digits = String(national ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return `${countryByCode(countryCode).dial}${digits}`;
}
