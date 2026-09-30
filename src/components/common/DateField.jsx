import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import { formatDate } from '../../utils/format.js';
import {
  DAYS_IN_WEEK,
  addMonths,
  isOutOfBounds,
  monthGrid,
  monthYearLabel,
  parseISODate,
  toISODate,
  weekdayLabels,
  yearsInRange,
} from '../../utils/dates.js';
import AppText from './AppText.jsx';
import Button from './Button.jsx';
import Sheet from './Sheet.jsx';
import { FieldMessages } from './TextField.jsx';

// The app's counterpart of the web's `<input type="date">`: a field that opens a
// bottom sheet with a calendar in it.
//
// React Native has no such control, and a native one would mean a native module
// and a fresh dev-client build, so this is drawn from the Sheet, Button and
// AppText the app already has. The month and year in the header open a year
// list, because the field this was built for is a date of birth — three taps to
// reach 1998, not three hundred presses of a back arrow.
//
// `value` and `onChange` speak `YYYY-MM-DD`, the shape the API and the shared
// Zod schemas expect. `min` and `max` are inclusive bounds in the same shape.
export default function DateField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
  hint,
  error,
  clearable = true,
  style,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [pickingYear, setPickingYear] = useState(false);

  const selected = parseISODate(value);
  // The month the sheet opens on: the chosen date's, else the nearest month
  // still inside the bounds, else this one.
  const initial = selected ?? parseISODate(max) ?? new Date();
  const [shown, setShown] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const weeks = useMemo(() => monthGrid(shown.year, shown.month), [shown]);
  const weekdays = useMemo(() => weekdayLabels(), []);
  const years = useMemo(() => yearsInRange(min, max), [min, max]);
  // The list opens at the year already shown, not at the newest one: someone
  // correcting a 1998 birth date should not have to scroll fifty rows to see it.
  const yearIndex = Math.max(0, years.indexOf(shown.year));

  const isoOf = (day) => toISODate(new Date(shown.year, shown.month, day));
  const step = (by) => setShown(addMonths(shown, by));
  // A month is reachable when any day in it is.
  const monthBlocked = (by) => {
    const next = addMonths(shown, by);
    return monthGrid(next.year, next.month)
      .flat()
      .filter(Boolean)
      .every((day) => isOutOfBounds(toISODate(new Date(next.year, next.month, day)), min, max));
  };

  const close = () => {
    setOpen(false);
    setPickingYear(false);
  };

  const choose = (day) => {
    onChange(isoOf(day));
    close();
  };

  return (
    <View style={[styles.field, style]}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={label}
        accessibilityValue={{ text: selected ? formatDate(value) : placeholder }}
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
        ]}
      >
        <AppText tone={selected ? 'text' : 'muted'} numberOfLines={1} style={styles.value}>
          {selected ? formatDate(value) : placeholder}
        </AppText>
      </Pressable>
      <FieldMessages hint={hint} error={error} />

      <Sheet open={open} onClose={close} title={label}>
        <View style={styles.header}>
          <Pressable
            onPress={() => step(-1)}
            disabled={monthBlocked(-1)}
            accessibilityRole="button"
            accessibilityLabel={t('app.datePicker.previousMonth')}
            accessibilityState={{ disabled: monthBlocked(-1) }}
            style={[styles.arrow, { opacity: monthBlocked(-1) ? 0.35 : 1 }]}
          >
            <AppText weight="bold">‹</AppText>
          </Pressable>
          <Pressable
            onPress={() => setPickingYear((was) => !was)}
            accessibilityRole="button"
            accessibilityLabel={t('app.datePicker.chooseYear')}
            accessibilityState={{ expanded: pickingYear }}
            style={styles.monthLabel}
          >
            <AppText weight="semibold">{monthYearLabel(shown.year, shown.month)}</AppText>
          </Pressable>
          <Pressable
            onPress={() => step(1)}
            disabled={monthBlocked(1)}
            accessibilityRole="button"
            accessibilityLabel={t('app.datePicker.nextMonth')}
            accessibilityState={{ disabled: monthBlocked(1) }}
            style={[styles.arrow, { opacity: monthBlocked(1) ? 0.35 : 1 }]}
          >
            <AppText weight="bold">›</AppText>
          </Pressable>
        </View>

        {pickingYear ? (
          <FlatList
            data={years}
            keyExtractor={(year) => String(year)}
            style={styles.years}
            initialScrollIndex={yearIndex}
            // Every row is exactly YEAR_ROW high, so the list can be scrolled
            // to a year without measuring it first.
            getItemLayout={(_, index) => ({
              length: YEAR_ROW,
              offset: YEAR_ROW * index,
              index,
            })}
            renderItem={({ item: year }) => {
              const active = year === shown.year;
              return (
                <Pressable
                  onPress={() => {
                    setShown({ ...shown, year });
                    setPickingYear(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={String(year)}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.year,
                    { borderBottomColor: colors.border },
                    active && { backgroundColor: colors.brandSoft },
                  ]}
                >
                  <AppText weight={active ? 'semibold' : 'regular'}>{year}</AppText>
                </Pressable>
              );
            }}
          />
        ) : (
          <View>
            <View style={styles.week} accessibilityElementsHidden>
              {weekdays.map((day, index) => (
                <AppText
                  key={index}
                  variant="label"
                  tone="muted"
                  style={styles.cellText}
                  numberOfLines={1}
                >
                  {day}
                </AppText>
              ))}
            </View>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.week}>
                {week.map((day, dayIndex) => {
                  if (!day) return <View key={dayIndex} style={styles.cell} />;
                  const iso = isoOf(day);
                  const blocked = isOutOfBounds(iso, min, max);
                  const active = iso === value;
                  return (
                    <Pressable
                      key={dayIndex}
                      onPress={() => choose(day)}
                      disabled={blocked}
                      accessibilityRole="button"
                      accessibilityLabel={formatDate(iso)}
                      accessibilityState={{ selected: active, disabled: blocked }}
                      style={[
                        styles.cell,
                        active && { backgroundColor: colors.brandBtn, borderRadius: RADII.md },
                      ]}
                    >
                      {/* A day outside the bounds is dimmed, and its
                          accessibilityState says so too, so the dimming is
                          never the only signal. */}
                      <AppText
                        style={blocked ? styles.dimCellText : styles.cellText}
                        tone={blocked ? 'muted' : active ? 'onBrand' : 'text'}
                        weight={active ? 'bold' : 'regular'}
                      >
                        {day}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {clearable && value ? (
          <Button
            variant="secondary"
            onPress={() => {
              onChange('');
              close();
            }}
          >
            {t('app.datePicker.clear')}
          </Button>
        ) : null}
      </Sheet>
    </View>
  );
}

const CELL = `${100 / DAYS_IN_WEEK}%`;
// A year row's exact height. In React Native a border sits inside a set height,
// so this is what getItemLayout above reports.
const YEAR_ROW = MIN_TOUCH;

const styles = StyleSheet.create({
  field: { gap: SPACING.xs },
  input: {
    minHeight: MIN_TOUCH + 4,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
  },
  value: { fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  arrow: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: { flexDirection: 'row' },
  cell: {
    width: CELL,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { textAlign: 'center' },
  dimCellText: { textAlign: 'center', opacity: 0.4 },
  years: { maxHeight: 280 },
  year: {
    height: YEAR_ROW,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
  },
});
