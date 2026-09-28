import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import NoticeHost from '../components/common/NoticeHost.jsx';
import UpdateGate from '../components/common/UpdateGate.jsx';
import { useAuthBootstrap } from '../hooks/useAuthBootstrap.js';
import { useNotificationSocket } from '../hooks/useNotificationSocket.js';
import { useNotificationTaps, usePushRegistration } from '../hooks/usePush.js';
import i18n from '../i18n/index.js';
import { startAppLifecycle } from '../lib/appLifecycle.js';
import { queryClient } from '../lib/queryClient.js';
import { useUiStore } from '../store/uiStore.js';
import { FONT_ASSETS } from '../theme/fonts.js';
import { useTheme } from '../theme/useTheme.js';

// A screen opened directly (a deep link to a match, say) still has the tabs
// beneath it, so Back leads into the app rather than out of it.
export const unstable_settings = { initialRouteName: '(tabs)' };

// Keep the splash screen up until the fonts are loaded and the saved language
// and theme are restored, so the first frame is already the right one.
SplashScreen.preventAutoHideAsync();
startAppLifecycle();

// The session is restored from the keystore in the background: public screens
// do not wait for it. Push hangs off the session: this device is registered
// while somebody is signed in, a tapped notification opens what it is about,
// and one that arrives while the app is open is shown as a notice.
function SessionBootstrap() {
  useAuthBootstrap();
  usePushRegistration();
  useNotificationTaps();
  useNotificationSocket();
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const hasHydrated = useUiStore((s) => s.hasHydrated);
  const language = useUiStore((s) => s.language);
  const { scheme, colors } = useTheme();
  // A font that fails to load falls back to the system font rather than
  // leaving the app on its splash screen.
  const ready = (fontsLoaded || Boolean(fontError)) && hasHydrated;

  useEffect(() => {
    if (hasHydrated && language && language !== i18n.language) i18n.changeLanguage(language);
  }, [hasHydrated, language]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SessionBootstrap />
      <UpdateGate>
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
        />
      </UpdateGate>
      <NoticeHost />
    </QueryClientProvider>
  );
}
