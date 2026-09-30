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

  it.each(['staging', 'production'])('%s satisfies the app configuration', (profile) => {
    const config = loadEnv(stripPrefix(easJson.build[profile].env));
    expect(config.APP_ENV).toBe(profile);
    expect(config.API_URL.startsWith('https://')).toBe(true);
    expect(config.SOCKET_URL.startsWith('https://')).toBe(true);
  });
});
