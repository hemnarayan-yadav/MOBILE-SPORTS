// Adapted from frontend/src/components/common/ImageField.jsx: pick an image and
// it uploads (POST /media/upload) unchanged — no crop, no client-side
// processing, as on the web. Use with react-hook-form's <Controller>.
//
// The preview frame says nothing about the file: the upload keeps the picture's
// own size and aspect ratio. Logos are contained so none of the mark is cut
// off; photographs are covered.
import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';
import { mediaApi } from '../../api/media.api.js';
import { qk } from '../../api/queryKeys.js';
import { notify } from '../../store/noticeStore.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { apiErrorKey } from '../../utils/apiErrors.js';
import { uploadableImage } from '../../utils/mediaFile.js';
import AppText from './AppText.jsx';
import Button from './Button.jsx';
import { FieldMessages } from './TextField.jsx';

const SIZE = 72;
const WIDE_KINDS = new Set(['team_banner', 'tournament_banner', 'news_cover', 'gallery']);
const CONTAIN_KINDS = new Set(['team_logo', 'sponsor_logo']);
const FILE_ERRORS = Object.freeze({
  UNSUPPORTED_FILE_TYPE: 'errors.unsupportedFileType',
  FILE_TOO_LARGE: 'media.tooLarge',
});
const MEDIA_DEFAULTS = Object.freeze({ enabled: false, maxImageMb: 5 });

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

export default function ImageField({
  label,
  hint,
  kind,
  round = false,
  name,
  value,
  onChange,
  error,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: media = MEDIA_DEFAULTS } = useQuery({
    queryKey: qk.media.config,
    queryFn: mediaApi.config,
    staleTime: Infinity,
  });

  const upload = useMutation({
    mutationFn: (file) => mediaApi.upload(kind, file),
    onSuccess: (asset) => {
      onChange(asset.url);
      notify.success(t('media.uploaded'));
    },
    onError: (failure) => notify.error(t(apiErrorKey(failure))),
  });

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      upload.mutate(uploadableImage(result.assets[0], media));
    } catch (failure) {
      notify.error(t(FILE_ERRORS[failure.code] ?? 'common.error', failure.details));
    }
  };

  const frame = round
    ? { width: SIZE, height: SIZE, borderRadius: SIZE / 2 }
    : { width: WIDE_KINDS.has(kind) ? SIZE * 1.6 : SIZE, height: SIZE, borderRadius: RADII.md };

  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <View style={styles.row}>
        <View
          style={[
            styles.frame,
            frame,
            { backgroundColor: colors.surface2, borderColor: colors.border },
          ]}
        >
          {value ? (
            <Image
              source={{ uri: value }}
              style={styles.image}
              resizeMode={CONTAIN_KINDS.has(kind) ? 'contain' : 'cover'}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <AppText variant="title" tone="muted">
              {initials(name)}
            </AppText>
          )}
        </View>
        <View style={styles.actions}>
          <Button
            variant="secondary"
            onPress={pick}
            loading={upload.isPending}
            disabled={!media.enabled}
          >
            {value ? t('media.replace') : t('media.upload')}
          </Button>
          {value ? (
            <Button variant="ghost" disabled={upload.isPending} onPress={() => onChange('')}>
              {t('media.remove')}
            </Button>
          ) : null}
          {/* Without Cloudinary the API answers 503, so the control says so
              instead of looking broken. */}
          {!media.enabled ? (
            <AppText variant="small" tone="muted">
              {t('media.unavailable')}
            </AppText>
          ) : null}
        </View>
      </View>
      <FieldMessages hint={hint} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  frame: { borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  actions: { flex: 1, gap: SPACING.xs },
});
