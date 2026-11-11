// The bottom sheet every screen shares.
//
// There is one test here and it exists because the behaviour it pins was
// broken in a way nobody could see in a test: the scrim used to fill the
// window absolutely, which put it *underneath* the panel and left the platform
// to decide which of two overlapping views owned a touch. It decided for the
// panel, and tapping outside did nothing. The scrim is a sibling that takes
// the space the panel does not, so what is dimmed is what closes.
import { act, fireEvent, render } from '@testing-library/react-native';
import Sheet from '../components/common/Sheet.jsx';
import AppText from '../components/common/AppText.jsx';
import '../i18n/index.js';

const settle = () => act(async () => {});

it('closes when the dimmed page outside the panel is tapped', async () => {
  const onClose = jest.fn();
  const view = await render(
    <Sheet open onClose={onClose} title="Board settings">
      <AppText>Inside the panel</AppText>
    </Sheet>,
  );
  await settle();

  // The panel's own content is there, so the sheet really is open.
  expect(view.getByText('Inside the panel')).toBeTruthy();

  // `includeHiddenElements` because the panel declares itself
  // `accessibilityViewIsModal`, which hides its siblings — the scrim among
  // them — from assistive technology, and the query follows the same rule. A
  // screen reader closes the sheet by its cross; the scrim is for the finger.
  fireEvent.press(view.getByTestId('sheet-scrim', { includeHiddenElements: true }));
  await settle();

  expect(onClose).toHaveBeenCalledTimes(1);
});
