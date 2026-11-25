// The Super Admin's kill switch, as the app obeys it.
//
// It exists for the faults that are not in this codebase: the OTP provider
// stops delivering, a gateway goes down. Without it, people keep retrying into
// a wall and are told nothing — on 17 Nov that cost a morning of sign-ups and
// a pile of OTP messages that Meta accepted and never delivered.
//
// Three rules, and each one is here because the careless version of this
// screen locks somebody out for good:
//
//  1. **It fails open.** No answer from the API — offline, server down,
//     request refused — means the app runs. A switch that reads "unknown" as
//     "blocked" turns one outage into two, and the same rule is why
//     UpdateGate.jsx exists in the shape it does.
//  2. **A Super Admin is never blocked.** The screen that turns the switch off
//     is inside the app; blocking its owner would make the switch one-way.
//  3. **`auth` scope is the everyday one.** It closes sign-in, sign-up and the
//     invitation flow — the three places that spend an OTP — and leaves the
//     rest of the app, including a live match, alone. `app` stops everything
//     and will drop a scorer mid-match, so it is for a fault in the platform
//     itself.
//
// `onApp` says whether this client is one the switch was meant for: the same
// setting also drives the website, and the two are not always broken together
// — a bad release is pulled from the store while the site stays open.
import { useQuery } from '@tanstack/react-query';
import { useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mobileApi } from '../../api/mobile.api.js';
import { qk } from '../../api/queryKeys.js';
import { useAuthStore } from '../../store/authStore.js';
import { SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';
import Logo from './Logo.jsx';

// The switch is thrown while something is already broken, so the app may not
// learn about it for as long as this. Short enough to matter, long enough not
// to be a poll: the app also refetches whenever it returns to the foreground
// (lib/appLifecycle.js wires that into TanStack Query).
const CONFIG_STALE_MS = 2 * 60_000;
const CONFIG_REFETCH_MS = 5 * 60_000;

// Both spend an OTP: `auth` is signing in and signing up, `join` is accepting
// a team invitation, which proves the phone the same way.
const AUTH_SEGMENTS = ['auth', 'join'];

const SUPER_ADMIN = 'super_admin';

function useMaintenanceConfig() {
  const config = useQuery({
    queryKey: qk.mobile.config,
    queryFn: mobileApi.config,
    staleTime: CONFIG_STALE_MS,
    refetchInterval: CONFIG_REFETCH_MS,
    retry: false,
  });
  return config.data?.maintenance ?? null;
}

/** What the screen should say: the Super Admin's words, or our own. */
function maintenanceText(maintenance, language, t) {
  const custom = language === 'hi' ? maintenance?.messageHi : maintenance?.messageEn;
  const isAuth = maintenance?.scope === 'auth';
  return {
    title: t(isAuth ? 'app.maintenanceAuthTitle' : 'app.maintenanceTitle'),
    body: custom?.trim() || t(isAuth ? 'app.maintenanceAuthBody' : 'app.maintenanceBody'),
  };
}

function isBlocked(maintenance, role, segments) {
  if (!maintenance?.enabled || !maintenance.onApp || role === SUPER_ADMIN) return false;
  return maintenance.scope !== 'auth' || AUTH_SEGMENTS.includes(segments[0]);
}

// The navigator stays mounted underneath and the notice covers it. Swapping the
// navigator out for the notice crashed the app: the login gate still navigates,
// and expo-router throws when no navigator is mounted to receive it.
export default function MaintenanceGate({ children }) {
  const segments = useSegments();
  const role = useAuthStore((state) => state.user?.role);
  const maintenance = useMaintenanceConfig();

  return (
    <>
      {children}
      {isBlocked(maintenance, role, segments) ? <MaintenanceNotice maintenance={maintenance} /> : null}
    </>
  );
}

function MaintenanceNotice({ maintenance }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { title, body } = maintenanceText(maintenance, i18n.language, t);
  return (
    <SafeAreaView style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <View style={styles.logo}>
          <Logo height={36} title={t('nav.brand')} />
        </View>
        <AppText variant="title" accessibilityRole="header" style={styles.center}>
          {title}
        </AppText>
        <AppText tone="muted" style={styles.center}>
          {body}
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  logo: { alignItems: 'center' },
  center: { textAlign: 'center' },
});
