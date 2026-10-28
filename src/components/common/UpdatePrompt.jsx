// "There is a newer KhelScore" — offered once per release, on the home screen.
//
// An Android phone updates an app by itself only if it is set to, and plenty
// are not: people end up two releases behind and hit bugs that were fixed
// months ago. The hard case already exists — an app older than
// `minSupportedVersion` shows nothing but the update screen (UpdateGate) — and
// this is the soft one: a newer version is out, the app still works, so it
// asks rather than insists.
//
// It reads the same config the gate does, which the query cache has already
// fetched by the time the home screen draws, so this costs no request of its
// own. "Later" is remembered against that version: the same update is never
// asked for twice, and the next release asks again.
import { useQuery } from '@tanstack/react-query';
import { Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { mobileApi } from '../../api/mobile.api.js';
import { qk } from '../../api/queryKeys.js';
import { useUiStore } from '../../store/uiStore.js';
import { SPACING } from '../../theme/tokens.js';
import { isVersionOlder } from '../../utils/version.js';
import AppText from './AppText.jsx';
import Button from './Button.jsx';
import Sheet from './Sheet.jsx';
import { APP_VERSION, openStore } from './UpdateGate.jsx';

const CONFIG_STALE_MS = 30 * 60_000;

export default function UpdatePrompt() {
  const { t } = useTranslation();
  const skipped = useUiStore((state) => state.updateSkipped);
  const skipUpdate = useUiStore((state) => state.skipUpdate);
  const config = useQuery({
    queryKey: qk.mobile.config,
    queryFn: mobileApi.config,
    staleTime: CONFIG_STALE_MS,
    retry: false,
  });

  const latest = config.data?.latestVersion?.[Platform.OS] ?? null;
  // Nothing published, this build is current, or this version was already set
  // aside — in all three the screen says nothing.
  if (!latest || !isVersionOlder(APP_VERSION, latest) || !isVersionOlder(skipped ?? '0.0.0', latest)) {
    return null;
  }

  return (
    <Sheet open onClose={() => skipUpdate(latest)} title={t('app.updateAvailableTitle')}>
      <View style={styles.body}>
        <AppText tone="muted">{t('app.updateAvailableBody', { version: latest })}</AppText>
        <Button onPress={openStore}>{t('app.updateCta')}</Button>
        <Button variant="secondary" onPress={() => skipUpdate(latest)}>
          {t('app.updateLater')}
        </Button>
      </View>
    </Sheet>
  );
}

const styles = { body: { gap: SPACING.md } };
