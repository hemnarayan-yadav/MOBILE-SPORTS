// Translation parity, ported from frontend/src/tests/i18n.test.js.
import en from '../i18n/locales/en.json';
import hi from '../i18n/locales/hi.json';
import i18n from '../i18n/index.js';
import { apiErrorKey } from '../utils/apiErrors.js';

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]],
  );
}

const enEntries = new Map(flatten(en));
const hiEntries = new Map(flatten(hi));
const placeholders = (text) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  it('has exactly the same keys in English and Hindi', () => {
    expect([...hiEntries.keys()].sort()).toEqual([...enEntries.keys()].sort());
  });

  it('uses the same interpolation placeholders in both languages', () => {
    const mismatched = [...enEntries].filter(
      ([key, value]) =>
        placeholders(value).join() !== placeholders(hiEntries.get(key) ?? '').join(),
    );
    expect(mismatched.map(([key]) => key)).toEqual([]);
  });

  it('keeps keys at most three levels deep and never empty', () => {
    expect([...enEntries.keys()].filter((key) => key.split('.').length > 4)).toEqual([]);
    expect([...hiEntries].filter(([, value]) => !String(value).trim()).map(([key]) => key)).toEqual(
      [],
    );
  });

  it('defines both plural forms wherever a plural is used', () => {
    for (const key of enEntries.keys()) {
      if (key.endsWith('_one')) expect(enEntries.has(key.replace(/_one$/, '_other'))).toBe(true);
    }
  });

  it('starts in English and switches to Hindi', async () => {
    expect(i18n.language).toBe('en');
    expect(i18n.t('home.liveNow')).toBe('Live now');
    await i18n.changeLanguage('hi');
    expect(i18n.t('home.liveNow')).toBe(hi.home.liveNow);
    await i18n.changeLanguage('en');
  });
});

describe('API error messages', () => {
  it('maps error codes to their translation, and anything unknown to a generic message', () => {
    expect(apiErrorKey({ code: 'MEDIA_UPLOAD_FAILED' })).toBe('errors.mediaUploadFailed');
    expect(apiErrorKey({ code: 'RATE_LIMITED' })).toBe('errors.rateLimited');
    expect(apiErrorKey({ code: 'SOMETHING_NEW' })).toBe('common.error');
    expect(apiErrorKey({})).toBe('common.error');
    expect(apiErrorKey(null)).toBe('common.error');
  });

  it('uses the network and link overrides', () => {
    expect(apiErrorKey({ code: 'NETWORK_ERROR' })).toBe('errors.network');
    expect(apiErrorKey({ code: 'INVALID_TOKEN' })).toBe('errors.invalidLink');
  });

  it('translates every phone verification failure code', () => {
    for (const code of [
      'OTP_CODE_INVALID',
      'OTP_EXPIRED',
      'OTP_ATTEMPTS_EXCEEDED',
      'OTP_RESEND_TOO_SOON',
      'OTP_SEND_LIMIT',
      'OTP_DELIVERY_FAILED',
      'OTP_CODE_FLOW_NOT_SUPPORTED',
      'OTP_PROVIDER_UNAVAILABLE',
      'OTP_UNAVAILABLE',
      'OTP_INVALID',
    ]) {
      expect(apiErrorKey({ code })).not.toBe('common.error');
    }
  });
});
