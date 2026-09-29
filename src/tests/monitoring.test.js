jest.mock('@sentry/react-native', () => ({ init: jest.fn(), captureException: jest.fn() }));

import * as Sentry from '@sentry/react-native';
import {
  captureError,
  initMonitoring,
  isMonitoringEnabled,
  scrubEvent,
  scrubValue,
} from '../lib/monitoring.js';

// Crash reporting (M4). Two things matter: nothing personal may leave the
// phone, and a build without a DSN must behave exactly as it did before.
beforeEach(() => jest.clearAllMocks());

describe('crash reports carry no personal data', () => {
  it('redacts a value under a sensitive key whatever it holds', () => {
    expect(
      scrubValue({
        password: 'Passw0rd123',
        otpToken: 'proof-abc',
        refreshToken: 'rt-1',
        phone: '+919876543210',
        email: 'asha@example.com',
        Authorization: 'Bearer abc.def.ghi',
        matchId: 'm1',
      }),
    ).toEqual({
      password: '[redacted]',
      otpToken: '[redacted]',
      refreshToken: '[redacted]',
      phone: '[redacted]',
      email: '[redacted]',
      Authorization: '[redacted]',
      matchId: 'm1',
    });
  });

  it('redacts a number, an address or a token quoted inside free text', () => {
    const scrubbed = scrubValue({
      message: 'failed for +919876543210 (asha@example.com)',
      note: 'token ExponentPushToken[abcdefghijklmnopqrstuv] rejected',
      header: 'Bearer eyJhbGciOi.eyJzdWIiOiJ1MSJ9.signature-value',
    });
    for (const text of Object.values(scrubbed)) {
      expect(text).toContain('[redacted]');
    }
    expect(JSON.stringify(scrubbed)).not.toMatch(/9876543210|asha@|ExponentPushToken\[a/);
  });

  it('scrubs nested values and stops at a sane depth', () => {
    const event = {
      exception: { values: [{ value: 'PHONE_TAKEN for +91 98765 43210', type: 'ConflictError' }] },
      breadcrumbs: [{ data: { url: '/users/me/delete', body: { password: 'secret' } } }],
    };
    const scrubbed = scrubValue(event);
    expect(scrubbed.exception.values[0].value).toBe('PHONE_TAKEN for [redacted]');
    expect(scrubbed.exception.values[0].type).toBe('ConflictError');
    expect(scrubbed.breadcrumbs[0].data.body.password).toBe('[redacted]');
    expect(scrubbed.breadcrumbs[0].data.url).toBe('/users/me/delete');
  });

  it('drops the identified user and the host from an event', () => {
    const scrubbed = scrubEvent({
      user: { id: 'u1', email: 'asha@example.com' },
      server_name: 'realme-P1',
      level: 'error',
    });
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.server_name).toBeUndefined();
    expect(scrubbed.level).toBe('error');
  });
});

describe('without a DSN', () => {
  it('never initialises the SDK and never sends anything', () => {
    expect(isMonitoringEnabled()).toBe(false);
    expect(initMonitoring()).toBe(false);
    captureError(new Error('boom'));
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
