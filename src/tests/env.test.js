import easJson from '../../eas.json';
import { loadEnv } from '../config/env.js';

const DEV = {
  APP_ENV: 'development',
  API_URL: 'http://localhost:5000/api/v1',
  SOCKET_URL: 'http://localhost:5000',
  SITE_URL: 'https://www.khelscore.in',
  DEFAULT_LOCALE: 'en',
};

const PROD = {
  APP_ENV: 'production',
  API_URL: 'https://api.khelscore.in/api/v1',
  SOCKET_URL: 'https://api.khelscore.in',
  SITE_URL: 'https://www.khelscore.in',
};

describe('app configuration (EXPO_PUBLIC_*)', () => {
  it('accepts a development configuration on plain http', () => {
    expect(loadEnv(DEV)).toEqual(DEV);
  });

  it('defaults the language to English and is frozen', () => {
    const env = loadEnv(PROD);
    expect(env.DEFAULT_LOCALE).toBe('en');
    expect(Object.isFrozen(env)).toBe(true);
  });

  it('refuses to start without the API address, naming the variable', () => {
    expect(() => loadEnv({ ...DEV, API_URL: undefined })).toThrow(/API_URL/);
    expect(() => loadEnv({ ...DEV, API_URL: '   ' })).toThrow(/API_URL/);
  });

  it('refuses an unknown environment or language', () => {
    expect(() => loadEnv({ ...DEV, APP_ENV: 'qa' })).toThrow(/APP_ENV/);
    expect(() => loadEnv({ ...DEV, DEFAULT_LOCALE: 'fr' })).toThrow(/DEFAULT_LOCALE/);
  });

  it('requires https for every address outside development', () => {
    for (const appEnv of ['staging', 'production']) {
      expect(() =>
        loadEnv({ ...PROD, APP_ENV: appEnv, API_URL: 'http://api.khelscore.in/api/v1' }),
      ).toThrow(/API_URL must use https/);
      expect(() =>
        loadEnv({ ...PROD, APP_ENV: appEnv, SOCKET_URL: 'http://api.khelscore.in' }),
      ).toThrow(/SOCKET_URL must use https/);
    }
  });
});

// The profiles that build on EAS servers carry their own values: `.env` is
// gitignored, so nothing else supplies one there. A profile missing an address
// builds fine and then throws at launch, which is how the staging profile
// shipped without an API URL — this reads the real eas.json so it cannot again.
// `development` is excluded on purpose: it is a local build and reads `.env`.
describe('eas.json build profiles', () => {
  const stripPrefix = (profileEnv) =>
    Object.fromEntries(
      Object.entries(profileEnv).map(([key, value]) => [key.replace('EXPO_PUBLIC_', ''), value]),
    );

  // `extends` supplies everything a profile does not set itself, so the env has
  // to be resolved the way EAS resolves it — a profile that only extends
  // another has no `env` key at all and would otherwise look empty.
  function resolveEnv(name, seen = new Set()) {
    if (seen.has(name)) throw new Error(`eas.json: circular extends at "${name}"`);
    seen.add(name);
    const profile = easJson.build[name];
    if (!profile) throw new Error(`eas.json: profile "${name}" does not exist`);
    const inherited = profile.extends ? resolveEnv(profile.extends, seen) : {};
    return { ...inherited, ...profile.env };
  }

  // Taken from the file, not listed here: a profile added later is checked too.
  const serverProfiles = Object.keys(easJson.build).filter((name) => name !== 'development');

  it.each(serverProfiles)('%s satisfies the app configuration', (profile) => {
    const config = loadEnv(stripPrefix(resolveEnv(profile)));
    // A server build must never carry the development environment: that is the
    // one setting that would let it talk to a plain-http address.
    expect(config.APP_ENV).not.toBe('development');
    expect(config.API_URL.startsWith('https://')).toBe(true);
    expect(config.SOCKET_URL.startsWith('https://')).toBe(true);
  });

  // Which EAS environment a profile reads its stored variables from is inferred
  // when the field is absent — `production` for a store build, `development`
  // for a dev client, `preview` for anything else. An internal-distribution
  // profile therefore silently reads `preview`, so a file variable such as
  // GOOGLE_SERVICES_JSON set on `production` would never reach it. Every server
  // profile names its environment instead of relying on that inference.
  it.each(serverProfiles)('%s names the EAS environment it reads', (profile) => {
    expect(easJson.build[profile].environment).toMatch(/^(preview|production)$/);
  });

  // Play accepts only an app bundle, and a test APK must not spend a version
  // code the next release needs, so these two differ on purpose.
  it('releases an app bundle and side-loads an APK on the production package', () => {
    expect(easJson.build.production.android.buildType).toBe('app-bundle');
    expect(easJson.build['production-apk'].android.buildType).toBe('apk');
    expect(easJson.build['production-apk'].distribution).toBe('internal');
    expect(easJson.build['production-apk'].autoIncrement).toBe(false);
    // The point of the APK: the real package, against the live backend.
    expect(resolveEnv('production-apk')).toEqual(resolveEnv('production'));
  });
});
