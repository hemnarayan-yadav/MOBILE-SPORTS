// Over-the-air updates: what the app does when it comes back to the
// foreground, and the one thing it must never do — reload itself while
// somebody is using it.

const updates = {
  isEnabled: true,
  available: true,
  checkError: null,
};

// expo-updates is a native module; under jest it is this mock. `isEnabled` is
// a getter so a case can turn updates off the way a development build has them
// off.
jest.mock('expo-updates', () => ({
  __esModule: true,
  get isEnabled() {
    return updates.isEnabled;
  },
  checkForUpdateAsync: jest.fn(async () => {
    if (updates.checkError) throw updates.checkError;
    return { isAvailable: updates.available };
  }),
  fetchUpdateAsync: jest.fn(async () => ({ isNew: true })),
  reloadAsync: jest.fn(async () => {}),
}));

import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { useOtaUpdate } from '../hooks/useOtaUpdate.js';

let foreground;
const remove = jest.fn();
jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
  foreground = listener;
  return { remove };
});

beforeEach(() => {
  updates.isEnabled = true;
  updates.available = true;
  updates.checkError = null;
  Updates.checkForUpdateAsync.mockClear();
  Updates.fetchUpdateAsync.mockClear();
  Updates.reloadAsync.mockClear();
  remove.mockClear();
  foreground = null;
});

// Every hook is unmounted again before the next case: a tree left mounted
// keeps its AppState listener, and the next case then measures both.
const mounted = [];

const mount = async () => {
  const rendered = await renderHook(() => useOtaUpdate());
  mounted.push(rendered);
  return rendered;
};

afterEach(async () => {
  while (mounted.length) await mounted.pop().unmount();
});

const returnToApp = async (state = 'active') => {
  await act(async () => {
    foreground(state);
  });
};

describe('over-the-air updates', () => {
  it('stops listening when the app tears down', async () => {
    const rendered = await mount();
    await act(async () => {});
    expect(typeof foreground).toBe('function');

    await rendered.unmount();

    expect(remove).toHaveBeenCalled();
  });

  it('does not check on mount — expo-updates already did that at launch', async () => {
    await mount();
    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('fetches a waiting update when the app comes back, and never reloads', async () => {
    await mount();

    await returnToApp();

    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.fetchUpdateAsync).toHaveBeenCalledTimes(1);
    // The whole point: the update waits for the next cold start. Reloading
    // here would restart the app under a live scorer.
    expect(Updates.reloadAsync).not.toHaveBeenCalled();
  });

  it('leaves the app alone when there is nothing new', async () => {
    updates.available = false;
    await mount();

    await returnToApp();

    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
    expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('checks once an hour, however often the app is opened', async () => {
    await mount();

    await returnToApp();
    await returnToApp('background');
    await returnToApp();

    expect(Updates.checkForUpdateAsync).toHaveBeenCalledTimes(1);
  });

  it('says nothing when updates are disabled or the check fails', async () => {
    updates.isEnabled = false;
    const disabled = await mount();
    await returnToApp();
    expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
    await disabled.unmount();

    updates.isEnabled = true;
    updates.checkError = new Error('offline');
    await mount();
    await expect(returnToApp()).resolves.toBeUndefined();
    expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

});
