import { create } from 'zustand';

// Short confirmations and errors shown over the current screen — the app's
// counterpart of the website's toasts, without a toast library. One message at
// a time; a newer one replaces it. Messages are already translated.
export const NOTICE_DURATION_MS = 3500;

let nextId = 0;

export const useNoticeStore = create((set) => ({
  notice: null, // { id, tone: 'success' | 'error' | 'info', message }
  show: (tone, message) => {
    nextId += 1;
    set({ notice: { id: nextId, tone, message } });
  },
  dismiss: (id) => set((state) => (state.notice?.id === id ? { notice: null } : state)),
}));

export const notify = Object.freeze({
  success: (message) => useNoticeStore.getState().show('success', message),
  error: (message) => useNoticeStore.getState().show('error', message),
  info: (message) => useNoticeStore.getState().show('info', message),
});
