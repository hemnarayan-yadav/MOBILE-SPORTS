import { useEffect } from 'react';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { PROMPTS, useNoticeStore } from '../store/noticeStore.js';

// What the signed-in account still owes, read from the account itself.
//
// `profileState` comes back from every way into the application (register,
// login, OTP login, refresh and GET/PATCH /users/me — API
// modules/users/profileState.js), so the reminders are always decided from the
// server's answer and never from a flag the app remembered. The only thing the
// app remembers is the dismissal (store/noticeStore.js `raised`), which is what
// keeps a dismissed reminder from reopening on a rerender, a navigation, a
// token refresh or the app returning to the foreground.
//
// A reminder therefore: appears once per sign-in, stays dismissed for the rest
// of that session, is checked again at the next sign-in, and stops appearing as
// soon as the account satisfies it.
export const isOwed = (profileState) =>
  Boolean(profileState) &&
  (profileState.profileComplete === false || profileState.mustChangePassword === true);

export function useAccountPrompts() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const showPrompt = useNoticeStore((s) => s.showPrompt);
  const resetPrompts = useNoticeStore((s) => s.resetPrompts);

  useEffect(() => {
    if (status === AUTH_STATUS.ANONYMOUS) resetPrompts();
  }, [status, resetPrompts]);

  useEffect(() => {
    if (status !== AUTH_STATUS.AUTHENTICATED || !user?.id) return;
    const { profileState } = user;
    if (!isOwed(profileState)) return;
    showPrompt({
      accountId: user.id,
      kind: PROMPTS.REMINDERS,
      missingFields: profileState.profileComplete ? [] : (profileState.missingFields ?? []),
      mustChangePassword: Boolean(profileState.mustChangePassword),
    });
  }, [status, user, showPrompt]);
}
