import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isOwed } from '../../hooks/useAccountPrompts.js';
import { useAuthStore } from '../../store/authStore.js';
import { NOTICE_DURATION_MS, PROMPTS, useNoticeStore } from '../../store/noticeStore.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';
import Button from './Button.jsx';
import Sheet from './Sheet.jsx';

const TONE_COLOR = Object.freeze({ success: 'success', error: 'danger', info: 'info' });

// Shows the current notice (store/noticeStore.js) at the top of the screen and
// removes it after a few seconds or on tap. Announced by screen readers.
function Notice() {
  const { colors } = useTheme();
  const notice = useNoticeStore((s) => s.notice);
  const dismiss = useNoticeStore((s) => s.dismiss);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => dismiss(notice.id), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice, dismiss]);

  if (!notice) return null;
  return (
    <SafeAreaView edges={['top']} style={styles.host} pointerEvents="box-none">
      <Pressable
        onPress={() => dismiss(notice.id)}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={[
          styles.notice,
          { backgroundColor: colors.surface, borderLeftColor: colors[TONE_COLOR[notice.tone]] },
        ]}
      >
        <AppText weight="semibold">{notice.message}</AppText>
      </Pressable>
    </SafeAreaView>
  );
}

// The welcome panel after signing up: what to do next, and nothing it insists
// on — the scrim, the system back gesture and Close all dismiss it, and the
// store makes sure it is never raised a second time.
function OnboardingPrompt({ prompt, onClose }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const teamCount = prompt.teamCount || 1;
  const go = (path) => {
    onClose();
    router.push(path);
  };
  return (
    <View style={styles.stack}>
      <AppText>{t('notice.welcomeText')}</AppText>
      <View style={[styles.reason, { backgroundColor: colors.surface2 }]}>
        <AppText weight="semibold">{t('notice.welcomeProfile')}</AppText>
        <AppText variant="small" tone="muted">
          {t('notice.welcomeProfileText')}
        </AppText>
      </View>
      <View style={[styles.reason, { backgroundColor: colors.surface2 }]}>
        <AppText weight="semibold">{t('notice.welcomeTeams', { count: teamCount })}</AppText>
        <AppText variant="small" tone="muted">
          {t('notice.welcomeTeamsText')}
        </AppText>
      </View>
      <Button onPress={() => go('/dashboard/profile')}>{t('notice.completeProfile')}</Button>
      <Button variant="secondary" onPress={() => go(prompt.teamPath ?? '/teams')}>
        {t('notice.viewTeams', { count: teamCount })}
      </Button>
      <Button variant="ghost" onPress={onClose}>
        {t('notice.later')}
      </Button>
    </View>
  );
}

// What the account still owes, after signing in. Both reasons are shown
// together when both apply, each with the thing it is asking for.
function RemindersPrompt({ prompt, onClose }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const fields = prompt.missingFields ?? [];
  const go = (params) => {
    onClose();
    router.push({ pathname: '/dashboard/profile', params });
  };
  return (
    <View style={styles.stack}>
      {fields.length > 0 ? (
        <View style={[styles.reason, { backgroundColor: colors.surface2 }]}>
          <AppText weight="semibold">{t('notice.profileTitle')}</AppText>
          <AppText variant="small" tone="muted">
            {t('notice.profileText')}
          </AppText>
          <AppText variant="small" tone="muted">
            {t('notice.profileMissing', {
              fields: fields.map((field) => t(`profile.field.${field}`)).join(', '),
            })}
          </AppText>
        </View>
      ) : null}
      {prompt.mustChangePassword ? (
        <View style={[styles.reason, { backgroundColor: colors.surface2 }]}>
          <AppText weight="semibold" tone="warning">
            {t('notice.passwordTitle')}
          </AppText>
          <AppText variant="small" tone="muted">
            {t('notice.passwordText')}
          </AppText>
        </View>
      ) : null}
      {fields.length > 0 ? (
        <Button onPress={() => go(undefined)}>{t('notice.openProfile')}</Button>
      ) : null}
      {prompt.mustChangePassword ? (
        <Button
          variant={fields.length > 0 ? 'secondary' : 'primary'}
          onPress={() => go({ changePassword: '1' })}
        >
          {t('profile.changePassword')}
        </Button>
      ) : null}
      <Button variant="ghost" onPress={onClose}>
        {t('notice.later')}
      </Button>
    </View>
  );
}

// The prompt on screen, if any (store/noticeStore.js). A reminder closes itself
// the moment the account satisfies it, so finishing the profile in another tab
// of the app does not leave a stale panel open.
function AccountPrompt() {
  const { t } = useTranslation();
  const prompt = useNoticeStore((s) => s.prompts[0] ?? null);
  const dismissPrompt = useNoticeStore((s) => s.dismissPrompt);
  const profileState = useAuthStore((s) => s.user?.profileState);
  const satisfied = prompt?.kind === PROMPTS.REMINDERS && !isOwed(profileState);

  useEffect(() => {
    if (satisfied) dismissPrompt(prompt.id);
  }, [satisfied, prompt, dismissPrompt]);

  if (!prompt || satisfied) return null;
  const onboarding = prompt.kind === PROMPTS.ONBOARDING;
  const close = () => dismissPrompt(prompt.id);
  return (
    <Sheet
      open
      onClose={close}
      title={t(onboarding ? 'notice.welcomeTitle' : 'notice.reminderTitle')}
    >
      {onboarding ? (
        <OnboardingPrompt prompt={prompt} onClose={close} />
      ) : (
        <RemindersPrompt prompt={prompt} onClose={close} />
      )}
    </Sheet>
  );
}

export default function NoticeHost() {
  return (
    <>
      <Notice />
      <AccountPrompt />
    </>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: SPACING.lg },
  notice: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderLeftWidth: 4,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  stack: { gap: SPACING.md },
  reason: { borderRadius: RADII.md, padding: SPACING.md, gap: SPACING.xs },
});
