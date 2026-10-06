import { create } from 'zustand';

// Short confirmations and errors shown over the current screen — the app's
// counterpart of the website's toasts, without a toast library. One message at
// a time; a newer one replaces it. Messages are already translated.
export const NOTICE_DURATION_MS = 3500;

// Prompts are the other half of this store: a panel the account is meant to
// read and act on, rather than a message that fades. Two of them exist —
// the welcome after signing up and the reminders after signing in — and both
// are shown by components/common/NoticeHost.jsx.
export const PROMPTS = Object.freeze({ ONBOARDING: 'onboarding', REMINDERS: 'reminders' });

let nextId = 0;

export const useNoticeStore = create((set) => ({
  notice: null, // { id, tone: 'success' | 'error' | 'info', message }
  show: (tone, message) => {
    nextId += 1;
    set({ notice: { id: nextId, tone, message } });
  },
  dismiss: (id) => set((state) => (state.notice?.id === id ? { notice: null } : state)),

  // The prompt queue; the first one is on screen. `raised` remembers which
  // prompts this app session has already put up, per account and kind, so a
  // rerender, a navigation, a token refresh or the app coming back to the
  // foreground can never reopen one that was dismissed. What a prompt *says*
  // is never remembered — that is read from the account's `profileState` every
  // time (see hooks/useAccountPrompts.js).
  prompts: [],
  raised: {},
  showPrompt: ({ accountId, kind, ...payload }) =>
    set((state) => {
      const key = `${accountId}:${kind}`;
      if (state.raised[key]) return state;
      nextId += 1;
      return {
        prompts: [...state.prompts, { id: nextId, accountId, kind, ...payload }],
        raised: { ...state.raised, [key]: true },
      };
    }),
  dismissPrompt: (id) =>
    set((state) => ({ prompts: state.prompts.filter((prompt) => prompt.id !== id) })),
  // Signing out ends the session the prompts belonged to, so the next sign-in
  // is checked again from scratch.
  resetPrompts: () => set({ prompts: [], raised: {} }),
}));

export const notify = Object.freeze({
  success: (message) => useNoticeStore.getState().show('success', message),
  error: (message) => useNoticeStore.getState().show('error', message),
  info: (message) => useNoticeStore.getState().show('info', message),
});
