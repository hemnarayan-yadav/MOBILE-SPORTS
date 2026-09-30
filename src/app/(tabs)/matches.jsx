// Matches — adapted from frontend/src/pages/public/Matches.jsx: live, upcoming
// and completed, as an infinite list instead of numbered pages, and with the
// completed tab's archive filters.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { matchesApi } from '../../api/matches.api.js';
import { qk } from '../../api/queryKeys.js';
import { tournamentsApi } from '../../api/tournaments.api.js';
import AppText from '../../components/common/AppText.jsx';
import Button from '../../components/common/Button.jsx';
import DateField from '../../components/common/DateField.jsx';
import { TabStrip } from '../../components/common/Layout.jsx';
import PagedList from '../../components/common/PagedList.jsx';
import SelectSheetField from '../../components/common/SelectSheetField.jsx';
import MatchCard from '../../components/match/MatchCard.jsx';
import { usePagedQuery } from '../../hooks/usePagedQuery.js';
import { RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { MATCH_ROUNDS, MATCH_STATUS } from '../../utils/constants.js';
import { todayISO } from '../../utils/dates.js';
import { MATCH_RANGES, rangeStart } from '../../utils/matchRanges.js';

const PAGE_SIZE = 12;
// Live cards refresh once a minute; an open match is pushed live over its socket.
const LIVE_REFRESH_MS = 60_000;
const TABS = Object.freeze([MATCH_STATUS.LIVE, MATCH_STATUS.UPCOMING, MATCH_STATUS.COMPLETED]);
// One page of tournaments for the filter. The API caps a page at 100, and the
// sheet brings its own search box once there are more than a dozen.
const TOURNAMENT_OPTIONS_LIMIT = 100;
// A named range is the one-tap common case; the from/to pair below it is for an
// exact span. The two answer the same question, so only one of them is ever set.
const RANGES = Object.freeze(Object.values(MATCH_RANGES));

const NO_FILTERS = Object.freeze({ tournament: '', round: '', range: '', from: '', to: '' });
const NO_DATES = Object.freeze({ range: '', from: '', to: '' });
const hasFilters = (filters) => Object.values(filters).some(Boolean);

export default function Matches() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [status, setStatus] = useState(MATCH_STATUS.LIVE);
  const [filters, setFilters] = useState(NO_FILTERS);
  const completed = status === MATCH_STATUS.COMPLETED;
  const filtered = completed && hasFilters(filters);

  // A named range is resolved once per choice, not on every render: a `from`
  // that moved with the clock would be a new query key each time. An exact span
  // is sent as it was picked.
  const params = useMemo(() => {
    if (!completed) return { status };
    return {
      status,
      tournament: filters.tournament,
      round: filters.round,
      from: filters.from || rangeStart(filters.range),
      to: filters.to,
    };
  }, [completed, status, filters]);

  const query = usePagedQuery({
    queryKey: qk.matches.list({ ...params, limit: PAGE_SIZE, paged: true }),
    fetchPage: ({ page }) => matchesApi.list({ ...params, page, limit: PAGE_SIZE }),
    refetchInterval: status === MATCH_STATUS.LIVE ? LIVE_REFRESH_MS : false,
  });

  const tournaments = useQuery({
    queryKey: qk.tournaments.list({ limit: TOURNAMENT_OPTIONS_LIMIT }),
    queryFn: () => tournamentsApi.list({ limit: TOURNAMENT_OPTIONS_LIMIT }),
    enabled: completed,
  });

  const set = (field) => (value) => setFilters({ ...filters, [field]: value });
  // Picking a named range clears an exact span, and picking either bound clears
  // the range, so the two can never disagree about what is being asked for.
  const setRange = (range) => setFilters({ ...filters, ...NO_DATES, range });
  const setBound = (field) => (value) => setFilters({ ...filters, range: '', [field]: value });

  const header = (
    <View style={styles.header}>
      <AppText variant="heading" accessibilityRole="header">
        {t('match.pageTitle')}
      </AppText>
      <AppText tone="muted">{t('match.pageSubtitle')}</AppText>
      <TabStrip
        label={t('match.pageTitle')}
        value={status}
        onChange={setStatus}
        tabs={TABS.map((id) => ({ id, label: t(`match.tab${id[0].toUpperCase()}${id.slice(1)}`) }))}
      />
      {/* The archive filters belong to the completed tab alone: the live tab is a
          real-time view of what is on right now, and the upcoming one is short by
          nature, while completed matches only grow in number. */}
      {completed ? (
        <View
          style={[styles.filters, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <SelectSheetField
            label={t('match.tournament')}
            placeholder={t('match.filter.allTournaments')}
            value={filters.tournament}
            onChange={set('tournament')}
            options={(tournaments.data?.items ?? []).map((tournament) => ({
              value: tournament.id,
              label: tournament.name,
            }))}
          />
          <SelectSheetField
            label={t('match.round')}
            placeholder={t('match.filter.allRounds')}
            value={filters.round}
            onChange={set('round')}
            options={MATCH_ROUNDS.map((value) => ({ value, label: t(`round.${value}`) }))}
          />
          <SelectSheetField
            label={t('app.matchRange.label')}
            placeholder={t('common.all')}
            value={filters.range}
            onChange={setRange}
            options={RANGES.map((value) => ({ value, label: t(`app.matchRange.${value}`) }))}
          />
          <AppText variant="label" tone="muted">
            {t('app.datePicker.exactSpan')}
          </AppText>
          {/* Each bound limits the other, and neither can reach into the
              future: a completed match cannot have been played tomorrow. */}
          <DateField
            label={t('match.filter.from')}
            placeholder={t('app.datePicker.pick')}
            value={filters.from}
            onChange={setBound('from')}
            max={filters.to || todayISO()}
          />
          <DateField
            label={t('match.filter.to')}
            placeholder={t('app.datePicker.pick')}
            value={filters.to}
            onChange={setBound('to')}
            min={filters.from}
            max={todayISO()}
          />
          {hasFilters(filters) ? (
            <Button variant="secondary" onPress={() => setFilters(NO_FILTERS)}>
              {t('match.filter.clear')}
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]} edges={['top']}>
      <PagedList
        query={query}
        items={query.items}
        renderItem={({ item }) => <MatchCard match={item} />}
        header={header}
        emptyTitle={filtered ? t('match.filter.emptyTitle') : t(`match.empty.${status}`)}
        emptyHint={filtered ? t('match.filter.emptyHint') : t('match.emptyHint')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { gap: SPACING.sm, marginBottom: SPACING.xs },
  filters: { borderWidth: 1, borderRadius: RADII.xxl, padding: SPACING.lg, gap: SPACING.md },
});
