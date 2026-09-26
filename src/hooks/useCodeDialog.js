// Ported from frontend/src/hooks/useCodeDialog.js (unchanged logic; the sheet is
// the app's own OtpCodeSheet).
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import OtpCodeSheet from '../components/otp/OtpCodeSheet.jsx';

// The shared machinery behind every one-time code KhelScore asks for, whether
// it went to a phone on WhatsApp or to an email address: send a code, open the
// dialog, and hand back the proof the API accepts.
//
// `ask(destination)` resolves with the proof, or with null when the result no
// longer matters (the dialog was closed, a newer attempt started, or the page
// unmounted). It rejects with `{ code }` when the code cannot be sent at all.
//
// Screens render `dialog` (null unless the sheet is open). Nothing here blocks
// a form: a closed sheet leaves the user free to try again.
export function useCodeDialog({ sendCode, verifyCode, format, channel }) {
  const attempt = useRef(0);
  const sending = useRef(false);
  const [request, setRequest] = useState(null);

  useEffect(
    () => () => {
      attempt.current += 1;
    },
    [],
  );

  const ask = useCallback(
    async (destination) => {
      // A second tap while the code is on its way must not send another one.
      if (sending.current) return null;
      attempt.current += 1;
      const current = attempt.current;
      const isCurrent = () => current === attempt.current;

      sending.current = true;
      let challenge;
      try {
        challenge = await sendCode(destination);
      } catch (error) {
        if (isCurrent()) throw error;
        return null;
      } finally {
        sending.current = false;
      }
      if (!isCurrent()) return null;
      const proof = await new Promise((resolve) => setRequest({ destination, challenge, resolve }));
      return isCurrent() ? proof : null;
    },
    [sendCode],
  );

  const settle = (proof) => {
    request?.resolve(proof);
    setRequest(null);
  };

  const dialog = request
    ? createElement(OtpCodeSheet, {
        key: request.challenge.challengeId,
        sentTo: format(request.destination),
        channel,
        challenge: request.challenge,
        verifyCode,
        resendCode: () => sendCode(request.destination),
        onVerified: settle,
        onCancel: () => settle(null),
      })
    : null;

  return { ask, dialog };
}
