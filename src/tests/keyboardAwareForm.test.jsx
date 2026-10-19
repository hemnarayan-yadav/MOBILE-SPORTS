import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import Screen from '../components/common/Screen.jsx';
import TextField from '../components/common/TextField.jsx';
import {
  FIELD_CLEARANCE,
  FieldFocusContext,
  liftFieldAboveKeyboard,
  useFieldFocus,
} from '../components/common/fieldFocus.js';
import '../i18n/index.js';

// Reports back what the surrounding frame handed it. RNTL only exposes host
// components, so this is how a child can show what it was given.
function Probe() {
  const onFieldFocus = useFieldFocus();
  return <View accessibilityLabel="probe" accessibilityValue={{ text: typeof onFieldFocus }} />;
}

// The sign-up form is the long one: name, jersey, email, state, district, then
// the password and its confirmation. Before this, Android had no keyboard
// handling at all (no `behavior` means React Native's KeyboardAvoidingView
// renders a plain View, and `adjustResize` stopped resizing the window once the
// app went edge to edge), and neither platform scrolled the focused field into
// view — so the last fields on the form sat behind the keyboard.
describe('a form screen and the keyboard', () => {
  it('hands every field inside it the way to be lifted above the keyboard', async () => {
    await render(
      <Screen title="Create account">
        <Probe />
      </Screen>,
    );

    expect(screen.getByLabelText('probe').props.accessibilityValue.text).toBe('function');
  });

  it('lifts the field clear of the keyboard without pulling the content down', () => {
    const scroll = { scrollResponderScrollNativeHandleToKeyboard: jest.fn() };
    const field = { id: 'password-input' };

    liftFieldAboveKeyboard(scroll, field);

    // The clearance leaves room for the next field or the submit button under
    // it, and `true` is preventNegativeScrollOffset: no jump when the field is
    // already visible.
    expect(scroll.scrollResponderScrollNativeHandleToKeyboard).toHaveBeenCalledWith(
      field,
      FIELD_CLEARANCE,
      true,
    );
    expect(FIELD_CLEARANCE).toBeGreaterThan(0);
  });

  it('does nothing when there is no field or no scrolling frame', () => {
    const scroll = { scrollResponderScrollNativeHandleToKeyboard: jest.fn() };
    liftFieldAboveKeyboard(scroll, null);
    liftFieldAboveKeyboard(null, { id: 'password-input' });
    liftFieldAboveKeyboard({}, { id: 'password-input' });
    expect(scroll.scrollResponderScrollNativeHandleToKeyboard).not.toHaveBeenCalled();
  });

  it('reports the focused input to the frame, and still calls the field own onFocus', async () => {
    const onFieldFocus = jest.fn();
    const onFocus = jest.fn();
    await render(
      <View>
        <FieldFocusContext.Provider value={onFieldFocus}>
          <TextField label="Password" secureTextEntry onFocus={onFocus} />
        </FieldFocusContext.Provider>
      </View>,
    );

    const input = screen.getByLabelText('Password');
    input.props.onFocus({ target: input });

    expect(onFieldFocus).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it('leaves a field outside a form screen alone', async () => {
    const onFocus = jest.fn();
    await render(
      <View>
        <TextField label="Password" secureTextEntry onFocus={onFocus} />
      </View>,
    );

    const input = screen.getByLabelText('Password');
    expect(() => input.props.onFocus({ target: input })).not.toThrow();
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});
