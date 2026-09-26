import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NOTICE_DURATION_MS, useNoticeStore } from '../../store/noticeStore.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';

const TONE_COLOR = Object.freeze({ success: 'success', error: 'danger', info: 'info' });

// Shows the current notice (store/noticeStore.js) at the top of the screen and
// removes it after a few seconds or on tap. Announced by screen readers.
export default function NoticeHost() {
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
});
