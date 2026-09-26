// Adapted from frontend/src/components/otp/OtpCodeSheet.jsx: the same states,
// limits and error handling, rendered as a native bottom sheet.
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { useNow } from '../../hooks/useNow.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import AppText from '../common/AppText.jsx';
import Button from '../common/Button.jsx';
import Sheet from '../common/Sheet.jsx';

// KhelScore's code-entry sheet. It opens once a code has been sent
// (`challenge`), checks what the user types, and hands back the proof through
// `onVerified`. Closing it is `onCancel`. Every message comes from an error
// code, never from server text.

const CODE_MIN_LENGTH = 4;
const CODE_MAX_LENGTH = 8;
// A device clock running behind the server would otherwise show a long wait.
const MAX_RESEND_WAIT_MS = 5 * 60_000;
// After these the code can no longer be used; only a new code helps.
const CODE_CLOSING_ERRORS = new Set(['OTP_EXPIRED', 'OTP_ATTEMPTS_EXCEEDED']);

function resendDeadline(challenge) {
  const at = Date.parse(challenge.resendAvailableAt);
  const now = Date.now();
  return Number.isNaN(at) ? now : Math.min(at, now + MAX_RESEND_WAIT_MS);
}

export default function OtpCodeSheet({
  sentTo,
  channel,
  challenge,
  verifyCode,
  resendCode,
  onVerified,
  onCancel,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const inputRef = useRef(null);
  const [challengeId, setChallengeId] = useState(challenge.challengeId);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [codeClosed, setCodeClosed] = useState(false);
  const [sendingStopped, setSendingStopped] = useState(false);
  const [resendAt, setResendAt] = useState(() => resendDeadline(challenge));
  // useNow re-renders every second; the remaining wait is read from the clock
  // itself so a wait set between ticks is shown exactly.
  useNow();
  const waitSeconds = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, []);

  const check = useMutation({
    mutationFn: verifyCode,
    onSuccess: ({ otpToken }) => onVerified(otpToken),
    onError: (failure) => {
      setNotice(null);
      setError(failure);
      if (CODE_CLOSING_ERRORS.has(failure.code)) setCodeClosed(true);
    },
  });

  const resend = useMutation({
    mutationFn: resendCode,
    onSuccess: (next) => {
      setChallengeId(next.challengeId);
      setResendAt(resendDeadline(next));
      setCode('');
      setError(null);
      setCodeClosed(false);
      setNotice('otp.newCodeSent');
      inputRef.current?.focus();
    },
    onError: (failure) => {
      setNotice(null);
      setError(failure);
      if (failure.code === 'OTP_RESEND_TOO_SOON') {
        setResendAt(Date.now() + (failure.details?.retryAfterSeconds ?? 0) * 1000);
      }
      if (failure.code === 'OTP_SEND_LIMIT') setSendingStopped(true);
    },
  });

  const submit = () => {
    if (code.length >= CODE_MIN_LENGTH && !codeClosed) check.mutate({ challengeId, code });
  };

  return (
    <Sheet open onClose={onCancel} title={t('otp.title')}>
      <AppText tone="muted">{t('otp.sentTo', { destination: sentTo, context: channel })}</AppText>
      <View style={styles.field}>
        <AppText variant="label">{t('otp.codeLabel')}</AppText>
        <TextInput
          ref={inputRef}
          accessibilityLabel={t('otp.codeLabel')}
          value={code}
          onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, CODE_MAX_LENGTH))}
          onSubmitEditing={submit}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={CODE_MAX_LENGTH}
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.bg,
              borderColor: error ? colors.danger : colors.border,
            },
          ]}
        />
      </View>
      {error ? (
        <AppText tone="danger" accessibilityLiveRegion="polite">
          {t(apiErrorKey(error))}
        </AppText>
      ) : null}
      {notice && !error ? (
        <AppText tone="success" accessibilityLiveRegion="polite">
          {t(notice)}
        </AppText>
      ) : null}
      <Button
        onPress={submit}
        loading={check.isPending}
        disabled={codeClosed || code.length < CODE_MIN_LENGTH}
      >
        {t('otp.verify')}
      </Button>
      <Button
        variant="ghost"
        loading={resend.isPending}
        disabled={sendingStopped || waitSeconds > 0}
        onPress={() => resend.mutate()}
      >
        {waitSeconds > 0 ? t('otp.resendIn', { seconds: waitSeconds }) : t('otp.resend')}
      </Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.xs },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: RADII.md,
    fontSize: 26,
    letterSpacing: 10,
    textAlign: 'center',
  },
});
