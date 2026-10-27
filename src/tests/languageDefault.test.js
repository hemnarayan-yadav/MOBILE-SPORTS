// Which language the app opens in before anybody has chosen one — ported from
// frontend/src/tests/languageDefault.test.js, where the browser plays the part
// the phone plays here.
// Prefixed `mock` so jest allows the factory below to reach it.
const mockLocales = jest.fn(() => []);
jest.mock('expo-localization', () => ({ getLocales: () => mockLocales() }));

import { deviceLanguage } from '../i18n/index.js';

const phoneAsksFor = (value) => {
  mockLocales.mockImplementation(() => {
    if (value instanceof Error) throw value;
    return value;
  });
  return deviceLanguage();
};

describe('the language the app starts in', () => {
  it('follows the phone when nothing has been chosen', () => {
    expect(phoneAsksFor([{ languageCode: 'hi' }])).toBe('hi');
    expect(phoneAsksFor([{ languageCode: 'en' }])).toBe('en');
  });

  it('takes the first language the phone asks for that the app has', () => {
    expect(phoneAsksFor([{ languageCode: 'ta' }, { languageCode: 'hi' }])).toBe('hi');
  });

  it('has no language of its own for one the app does not carry', () => {
    expect(phoneAsksFor([{ languageCode: 'ta' }])).toBeNull();
    expect(phoneAsksFor([])).toBeNull();
  });

  it('survives a platform that cannot say', () => {
    expect(phoneAsksFor(new Error('no such module'))).toBeNull();
    expect(phoneAsksFor([{}])).toBeNull();
  });
});
