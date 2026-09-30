import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MIN_TOUCH, RADII, SPACING } from '../../theme/tokens.js';
import { useTheme } from '../../theme/useTheme.js';
import AppText from './AppText.jsx';
import SearchField from './SearchField.jsx';
import Sheet from './Sheet.jsx';
import { FieldMessages } from './TextField.jsx';

// The app's counterpart of the web's <select>: a field that opens a bottom
// sheet with the options in it.
//
// The web can hand a native <select> 778 districts and the platform makes it
// usable; React Native has no such control, so the sheet carries its own search
// box. That is also why this is not a picker dependency — a searchable list is
// what a 75-district state actually needs, and it is built from the Sheet,
// SearchField and TextField the app already has.
const SEARCH_THRESHOLD = 12;

export default function SelectSheetField({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
  hint,
  error,
  style,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((option) => option.value === value);
  const searchable = options.length > SEARCH_THRESHOLD;
  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, search]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  return (
    <View style={[styles.field, style]}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <AppText tone={selected ? 'text' : 'muted'} numberOfLines={1} style={styles.value}>
          {selected?.label ?? placeholder}
        </AppText>
      </Pressable>
      <FieldMessages hint={hint} error={error} />

      <Sheet open={open} onClose={close} title={label}>
        {searchable && (
          <SearchField value={search} onChange={setSearch} placeholder={t('app.searchLabel')} />
        )}
        <FlatList
          data={[{ value: '', label: placeholder }, ...shown]}
          keyExtractor={(option) => option.value || 'none'}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  close();
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
                style={[
                  styles.option,
                  { borderBottomColor: colors.border },
                  active && { backgroundColor: colors.brandSoft },
                ]}
              >
                <AppText
                  weight={active ? 'semibold' : 'regular'}
                  tone={item.value ? 'text' : 'muted'}
                >
                  {item.label}
                </AppText>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <AppText tone="muted" style={styles.empty}>
              {t('app.noMatches')}
            </AppText>
          }
        />
      </Sheet>
    </View>
  );
}

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
  list: { maxHeight: 320 },
  option: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
  },
  empty: { paddingVertical: SPACING.md, textAlign: 'center' },
});
