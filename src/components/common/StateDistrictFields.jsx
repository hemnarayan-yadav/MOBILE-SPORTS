import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SPACING } from '../../theme/tokens.js';
import { INDIA_STATES, districtsOf } from '../../utils/india.js';
import SelectSheetField from './SelectSheetField.jsx';

// Ported from frontend/src/components/common/StateDistrictFields.jsx — same
// contract and the same clearing rule; the web renders two <select>s, the app
// two sheet pickers (SelectSheetField), since React Native has no <select>.
//
// Fully controlled, so a react-hook-form screen and a plain filter row can both
// use it. Picking a state clears the district in the same change, because a
// district from the previous state would no longer be one of the offered
// options — leaving it would send a pair the API refuses.
export default function StateDistrictFields({
  state = '',
  district = '',
  onChange,
  errors = {},
  variant = 'form',
  style,
}) {
  const { t } = useTranslation();
  const districts = useMemo(() => districtsOf(state), [state]);
  const filtering = variant === 'filter';

  return (
    <View style={[styles.row, style]}>
      <SelectSheetField
        style={styles.field}
        label={t('location.state')}
        value={state}
        onChange={(next) => onChange({ state: next, district: '' })}
        placeholder={t(filtering ? 'location.allStates' : 'location.statePlaceholder')}
        options={INDIA_STATES.map(({ code, name }) => ({ value: code, label: name }))}
        error={errors.state}
      />
      <SelectSheetField
        style={styles.field}
        label={t('location.district')}
        value={district}
        disabled={!state}
        onChange={(next) => onChange({ state, district: next })}
        placeholder={t(filtering ? 'location.allDistricts' : 'location.districtPlaceholder')}
        options={districts.map((name) => ({ value: name, label: name }))}
        hint={state ? undefined : t('location.pickStateFirst')}
        error={errors.district}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACING.md },
  field: { flex: 1 },
});
