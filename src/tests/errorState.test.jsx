// Play review rejected version code 3 under Broken Functionality, having seen
// nothing but "Can't reach the server" with a Retry button that gave no answer
// when pressed (2026-10-22). While the server stays unreachable the retry
// re-renders the very same screen, so the button has to say for itself that it
// heard the press — otherwise the only control on screen reads as dead.
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ErrorState } from '../components/common/States.jsx';
import { renderWithQuery } from './helpers.jsx';

// Resolves when the test decides, so the in-flight state can be inspected.
function deferred() {
  let settle;
  const promise = new Promise((resolve) => {
    settle = resolve;
  });
  return { promise, settle: () => settle() };
}

// The press is sent to the label rather than to the element found by role:
// fireEvent.press resolves a Pressable through its children, and once the
// retry is running the label is gone, which is itself the guard under test.
const pressRetry = () => fireEvent.press(screen.getByText('Retry'));

describe('ErrorState retry', () => {
  it('shows the retry label until it is pressed', async () => {
    await renderWithQuery(<ErrorState error={{ code: 'NETWORK_ERROR' }} onRetry={() => {}} />);

    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('answers the press with a busy control, then returns to the label', async () => {
    const { promise, settle } = deferred();
    const onRetry = jest.fn(() => promise);

    await renderWithQuery(<ErrorState error={{ code: 'NETWORK_ERROR' }} onRetry={onRetry} />);
    pressRetry();

    // The label gives way to a spinner and the button reports itself busy and
    // disabled, so the press is visible even though the error has not changed.
    // Disabled is what stops a second press reaching onRetry.
    await waitFor(() => expect(screen.queryByText('Retry')).toBeNull());
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });

    await act(async () => {
      settle();
    });
    await waitFor(() => expect(screen.getByText('Retry')).toBeTruthy());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('recovers the label when the retry rejects, rather than staying stuck', async () => {
    const onRetry = jest.fn(() => Promise.reject(new Error('still offline')));

    await renderWithQuery(<ErrorState error={{ code: 'NETWORK_ERROR' }} onRetry={onRetry} />);
    pressRetry();

    // A rejected retry must neither leave the spinner up for ever nor surface
    // as an unhandled rejection.
    await waitFor(() => expect(screen.getByText('Retry')).toBeTruthy());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
