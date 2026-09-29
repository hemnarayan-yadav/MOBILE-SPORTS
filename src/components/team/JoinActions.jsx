// The invitee's side of a team invitation — ported from the JoinActions and
// useAcceptInvitations parts of frontend/src/pages/public/JoinTeam.jsx.
//
// Joining always needs an account that proves the invited number by OTP, so the
// paths here are the same whether or not the visitor arrived with a token: an
// OTP-verified number accepts every invitation waiting for it.
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { invitationsApi } from '../../api/invitations.api.js';
import { useAuth } from '../../hooks/useAuth.js';
import { usePhoneVerification } from '../../hooks/usePhoneVerification.js';
import { notify } from '../../store/noticeStore.js';
import { SPACING } from '../../theme/tokens.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import AppText from '../common/AppText.jsx';
import Button from '../common/Button.jsx';

/**
 * Accepts every pending invitation for the signed-in account's number, then
 * opens the invited team — using the server-verified team the accept response
 * names, never a client-side id.
 */
export function useAcceptInvitations(onAccepted) {
  const { t } = useTranslation();
  const router = useRouter();
  return useMutation({
    mutationFn: invitationsApi.accept,
    onSuccess: ({ accepted }) => {
      if (accepted.length === 0) {
        notify.info(t('join.nothingAccepted'));
        onAccepted?.();
        return;
      }
      notify.success(t('join.acceptedToast', { count: accepted.length }));
      // Several teams can be accepted at once; the first is the deterministic
      // landing spot, matching the team the invitation card named.
      const team = accepted[0].team;
      router.replace(team?.id ? `/team/${team.id}` : '/teams');
    },
    onError: (error) => notify.error(t(apiErrorKey(error))),
  });
}

export default function JoinActions({ otherNumber = false, accepting, onConfirm }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const phoneVerification = usePhoneVerification();

  const confirm = async () => {
    const otpToken = await phoneVerification.verify(user.phone).catch((error) => {
      notify.error(t(apiErrorKey(error)));
      return null;
    });
    if (otpToken) onConfirm(otpToken);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.stack}>
        <AppText>{t('join.signUpHint')}</AppText>
        <Button onPress={() => router.push('/auth/register')}>{t('join.signUp')}</Button>
        <Button variant="secondary" onPress={() => router.push('/auth/login')}>
          {t('join.signIn')}
        </Button>
      </View>
    );
  }
  if (!user?.phone) {
    return (
      <View style={styles.stack}>
        <AppText>{t('join.addPhone')}</AppText>
        <Button onPress={() => router.push('/dashboard/profile')}>{t('join.openProfile')}</Button>
      </View>
    );
  }
  // This invitation names a different number, so confirming this account's
  // number would not accept it: the only way in is the invited number itself.
  if (otherNumber) {
    return (
      <View style={styles.stack}>
        <AppText accessibilityLiveRegion="polite">{t('join.otherNumber')}</AppText>
        {/* Signing out keeps the visitor here, ready to sign in with the invited number. */}
        <Button variant="secondary" loading={logout.isPending} onPress={() => logout.mutate()}>
          {t('join.useAnotherAccount')}
        </Button>
      </View>
    );
  }
  return (
    <View style={styles.stack}>
      <AppText>{t('join.confirmHint')}</AppText>
      <Button loading={accepting} disabled={!phoneVerification.isAvailable} onPress={confirm}>
        {t('join.accept')}
      </Button>
      {!phoneVerification.isChecking && !phoneVerification.isAvailable ? (
        <AppText variant="small" tone="muted">
          {t('join.otpUnavailable')}
        </AppText>
      ) : null}
      <Button variant="ghost" loading={logout.isPending} onPress={() => logout.mutate()}>
        {t('join.useAnotherAccount')}
      </Button>
      {phoneVerification.dialog}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: SPACING.sm },
});
