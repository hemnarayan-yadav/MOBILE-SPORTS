// Five events, no personal data, and nothing at all without a key — ported
// from frontend/src/tests/analytics.test.js.
const mockClient = {
  identify: jest.fn(),
  capture: jest.fn(),
  reset: jest.fn(),
};
jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}));
jest.mock('../config/env.js', () => ({ env: { POSTHOG_KEY: 'phc_test', POSTHOG_HOST: undefined } }));

import PostHog from 'posthog-react-native';
import { EVENTS, identify, resetAnalytics, startAnalytics, track } from '../lib/analytics.js';

const USER = {
  id: 'u1',
  name: 'Ravi Kumar',
  phone: '+919812345610',
  role: 'captain',
  area: { state: 'CG', district: 'Durg', source: 'account' },
};

beforeEach(() => {
  PostHog.mockClear();
  Object.values(mockClient).forEach((fn) => fn.mockReset());
});

describe('measuring the five steps', () => {
  it('starts once, with session replay off', () => {
    startAnalytics();
    startAnalytics();

    expect(PostHog).toHaveBeenCalledTimes(1);
    expect(PostHog.mock.calls[0][1]).toMatchObject({ enableSessionReplay: false });
  });

  it('names a person by account, role and district — and nothing else', () => {
    startAnalytics();

    identify(USER);

    expect(mockClient.identify).toHaveBeenCalledWith('u1', {
      role: 'captain',
      state: 'CG',
      district: 'Durg',
    });
    const sent = JSON.stringify(mockClient.identify.mock.calls[0]);
    expect(sent).not.toContain(USER.name);
    expect(sent).not.toContain(USER.phone);
  });

  it('sends the events it is asked for, and survives a provider that throws', () => {
    startAnalytics();

    track(EVENTS.SQUAD_PLAYER_ADDED, { pending: true });
    expect(mockClient.capture).toHaveBeenCalledWith('squad_player_added', { pending: true });

    mockClient.capture.mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => track(EVENTS.SHARED, { kind: 'team' })).not.toThrow();
  });

  it('ends the trail when somebody signs out', () => {
    startAnalytics();
    resetAnalytics();
    expect(mockClient.reset).toHaveBeenCalled();
  });
});
