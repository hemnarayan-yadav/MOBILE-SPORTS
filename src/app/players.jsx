// Players — adapted from frontend/src/pages/public/Players.jsx: search, filter
// by playing role, infinite list.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { qk } from '../api/queryKeys.js';
import { playersApi } from '../api/teams.api.js';
import AppText from '../components/common/AppText.jsx';
import Avatar from '../components/common/Avatar.jsx';
import { BackHeader, Card, TabStrip } from '../components/common/Layout.jsx';
import PagedList from '../components/common/PagedList.jsx';
import SearchField from '../components/common/SearchField.jsx';
import { PlayingRoleBadge } from '../components/player/PlayerBits.jsx';
import TeamCrest from '../components/team/TeamCrest.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { usePagedQuery } from '../hooks/usePagedQuery.js';
import { SPACING } from '../theme/tokens.js';
import { useTheme } from '../theme/useTheme.js';
import { PLAYING_ROLES } from '../utils/constants.js';
import { formatNumber } from '../utils/format.js';

const PAGE_SIZE = 18;
const ALL_ROLES = '';

function PlayerRow({ player }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push(`/player/${player.id}`)} accessibilityRole="button">
      <Card style={styles.row}>
        <Avatar src={player.photoUrl} name={player.name} size="lg" />
        <View style={styles.flex}>
          <AppText weight="semibold" numberOfLines={1}>
            {player.name}
          </AppText>
          <View style={styles.team}>
            {player.currentTeam ? (
              <>
                <TeamCrest team={player.currentTeam} size="xs" />
                <AppText variant="small" tone="muted" numberOfLines={1} style={styles.flex}>
                  {player.currentTeam.name}
                </AppText>
              </>
            ) : (
              <AppText variant="small" tone="muted">
                {t('player.freeAgent')}
              </AppText>
            )}
          </View>
          {player.membership ? <PlayingRoleBadge role={player.membership.playingRole} /> : null}
        </View>
        <View style={styles.points}>
          <AppText variant="score">{formatNumber(player.careerStats?.totalPoints ?? 0)}</AppText>
          <AppText variant="label" tone="muted">
            {t('stats.points')}
          </AppText>
        </View>
      </Card>
    </Pressable>
  );
}

export default function Players() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState(ALL_ROLES);
  const debouncedSearch = useDebouncedValue(search);
  const params = { search: debouncedSearch, playingRole: role };
  const query = usePagedQuery({
    queryKey: qk.players.list({ ...params, limit: PAGE_SIZE, paged: true }),
    fetchPage: ({ page }) => playersApi.list({ ...params, page, limit: PAGE_SIZE }),
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <PagedList
        query={query}
        items={query.items}
        renderItem={({ item }) => <PlayerRow player={item} />}
        header={
          <View style={styles.header}>
            <BackHeader title={t('player.pageTitle')} />
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder={t('player.searchPlaceholder')}
            />
            <TabStrip
              label={t('player.playingRole')}
              value={role}
              onChange={setRole}
              tabs={[
                { id: ALL_ROLES, label: t('common.all') },
                ...PLAYING_ROLES.map((id) => ({ id, label: t(`playingRole.${id}`) })),
              ]}
            />
          </View>
        }
        emptyTitle={t('player.emptyTitle')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: SPACING.sm, marginBottom: SPACING.xs },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  team: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  points: { alignItems: 'flex-end' },
});
