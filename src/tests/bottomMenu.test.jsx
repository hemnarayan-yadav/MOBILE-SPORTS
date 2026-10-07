// The bottom menu must always be there, and always above Android's gesture
// bar. Both halves of that are pinned here: the five destinations the bar
// declares, and the safe-area provider the bar needs to know where the bottom
// of the usable screen is.
//
// Without a `SafeAreaProvider` the insets are missing, React Navigation gives
// the bar no bottom inset, and under edge-to-edge it is laid out behind the
// system navigation — present in the tree and invisible on the phone.
import { screen } from '@testing-library/react-native';

// A stand-in for expo-router's navigators that renders what it is given, so
// the declarations can be read back.
jest.mock('expo-router', () => {
  const react = require('react');
  const rn = require('react-native');
  const Tabs = ({ children }) => react.createElement(rn.View, { testID: 'tab-bar' }, children);
  Tabs.Screen = ({ options }) =>
    react.createElement(rn.Text, { testID: 'tab-item' }, options?.title ?? '');
  return {
    Tabs,
    Stack: ({ children }) => react.createElement(rn.View, { testID: 'stack' }, children),
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => ({}),
  };
});

import TabsLayout from '../app/(tabs)/_layout.jsx';
import { renderWithQuery, resetSession } from './helpers.jsx';

beforeEach(() => resetSession());

describe('the bottom menu', () => {
  it('declares every destination, with nothing dropped or collapsed', async () => {
    await renderWithQuery(<TabsLayout />);

    // Asserted on the label keys, so the list is pinned in either language.
    const labels = screen.getAllByTestId('tab-item').map((node) => node.props.children);
    expect(labels).toEqual(['nav.home', 'nav.matches', 'nav.tournaments', 'nav.rankings', 'nav.more']);
  });

  it('is rendered as one bar holding all five, not a subset', async () => {
    await renderWithQuery(<TabsLayout />);

    expect(screen.getByTestId('tab-bar')).toBeTruthy();
    expect(screen.getAllByTestId('tab-item')).toHaveLength(5);
  });
});

describe('the safe-area provider the bottom menu depends on', () => {
  // Every screen is wrapped in `SafeAreaView` and the tab bar asks for the
  // bottom inset; both are no-ops without a provider above them.
  it('wraps the app, with the first frame’s real insets', () => {
    const source = require('node:fs').readFileSync(
      require('node:path').join(__dirname, '..', 'app', '_layout.jsx'),
      'utf8',
    );

    expect(source).toContain("from 'react-native-safe-area-context'");
    expect(source).toContain('<SafeAreaProvider initialMetrics={initialWindowMetrics}>');
    // It is the outermost wrapper, so nothing that measures the screen sits
    // outside it.
    const provider = source.indexOf('<SafeAreaProvider');
    const query = source.indexOf('<QueryClientProvider');
    const stack = source.indexOf('<Stack');
    expect(provider).toBeGreaterThan(-1);
    expect(provider).toBeLessThan(query);
    expect(provider).toBeLessThan(stack);
  });
});
