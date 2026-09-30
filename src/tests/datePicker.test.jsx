import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import DateField from '../components/common/DateField.jsx';
import '../i18n/index.js';
import { formatDate } from '../utils/format.js';
import {
  DAYS_IN_WEEK,
  addMonths,
  daysInMonth,
  isISODate,
  isOutOfBounds,
  isoYearsAgo,
  monthGrid,
  parseISODate,
  toISODate,
  todayISO,
  yearsInRange,
} from '../utils/dates.js';
import { renderWithQuery, resetSession } from './helpers.jsx';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

beforeEach(resetSession);

describe('a date as the API sees it', () => {
  it('recognises the YYYY-MM-DD shape and nothing else', () => {
    expect(isISODate('2026-03-10')).toBe(true);
    expect(isISODate('10-03-2026')).toBe(false);
    expect(isISODate('2026-3-1')).toBe(false);
    expect(isISODate('')).toBe(false);
    expect(isISODate(null)).toBe(false);
  });

  it('writes the local calendar day, not the UTC one', () => {
    // The bug this guards: `toISOString().slice(0, 10)` on a date at 00:30 IST
    // hands back the day before, because IST is UTC+5:30.
    const justAfterMidnight = new Date(2026, 2, 10, 0, 30);
    expect(toISODate(justAfterMidnight)).toBe('2026-03-10');
    expect(toISODate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('reads a date back as the same local day', () => {
    const date = parseISODate('1998-07-24');
    expect(date.getFullYear()).toBe(1998);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(24);
    expect(toISODate(date)).toBe('1998-07-24');
  });

  it('refuses a day that does not exist rather than rolling it forward', () => {
    // `new Date(2026, 1, 31)` is 3 March; a picker must never accept that.
    expect(parseISODate('2026-02-31')).toBeNull();
    expect(parseISODate('2026-13-01')).toBeNull();
    expect(parseISODate('not a date')).toBeNull();
  });
});

describe('the month grid', () => {
  it('lays a month out in whole weeks starting on Monday', () => {
    // 1 March 2026 is a Sunday, so the first week is six blanks then the 1st.
    const weeks = monthGrid(2026, 2);
    expect(weeks.every((week) => week.length === DAYS_IN_WEEK)).toBe(true);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });

  it('starts a month that begins on a Monday with no blanks', () => {
    // 1 June 2026 is a Monday.
    expect(monthGrid(2026, 5)[0][0]).toBe(1);
  });

  it('knows how long a February is', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(monthGrid(2024, 1).flat().filter(Boolean)).toHaveLength(29);
  });

  it('steps between months without landing on a day the next one lacks', () => {
    // From January, a step must be February — not 3 March.
    expect(addMonths({ year: 2026, month: 0 }, 1)).toEqual({ year: 2026, month: 1 });
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('the picker bounds', () => {
  it('treats both bounds as inclusive', () => {
    expect(isOutOfBounds('2026-03-10', '2026-03-10', '2026-03-20')).toBe(false);
    expect(isOutOfBounds('2026-03-20', '2026-03-10', '2026-03-20')).toBe(false);
    expect(isOutOfBounds('2026-03-09', '2026-03-10', '2026-03-20')).toBe(true);
    expect(isOutOfBounds('2026-03-21', '2026-03-10', '2026-03-20')).toBe(true);
  });

  it('does not restrict anything when a bound is absent', () => {
    expect(isOutOfBounds('1998-07-24', '', '')).toBe(false);
    expect(isOutOfBounds('1998-07-24', undefined, undefined)).toBe(false);
  });

  it('offers every year in range, newest first, which is how a birth year is looked for', () => {
    const years = yearsInRange('1966-09-30', '2016-09-30');
    expect(years[0]).toBe(2016);
    expect(years.at(-1)).toBe(1966);
    expect(years).toHaveLength(51);
  });

  it('measures a bound a whole number of years back', () => {
    const now = new Date(2026, 8, 30);
    expect(isoYearsAgo(10, now)).toBe('2016-09-30');
    expect(isoYearsAgo(60, now)).toBe('1966-09-30');
  });

  it('knows today', () => {
    expect(todayISO(new Date(2026, 2, 10))).toBe('2026-03-10');
  });
});

// A controlled wrapper, the way every real caller uses the field.
function Field({ min, max, initial = '', onChange }) {
  const [value, setValue] = useState(initial);
  return (
    <DateField
      label="Date of birth"
      placeholder="Pick a date"
      value={value}
      min={min}
      max={max}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

// A day cell is labelled with the date as the reader sees it. Matched exactly,
// because "/4 Mar 2026/" as a pattern also finds the 14th and the 24th.
const day = (iso) => screen.getByLabelText(formatDate(iso));
// After a press that changes the month or the year, the grid is redrawn on the
// next render, so the new day is waited for rather than read straight away.
const dayAfterRedraw = (iso) => screen.findByLabelText(formatDate(iso));

const open = async () => {
  fireEvent.press(screen.getByLabelText('Date of birth'));
  await waitFor(() => expect(screen.getByLabelText('Choose year')).toBeTruthy());
};

describe('the date field', () => {
  it('shows the placeholder until a date is picked', async () => {
    await renderWithQuery(<Field />);
    expect(screen.getByText('Pick a date')).toBeTruthy();
  });

  it('shows a chosen date in the reader’s format, not the stored one', async () => {
    await renderWithQuery(<Field initial="1998-07-24" />);
    // en-IN medium: "24 Jul 1998" — taken from the formatter, not spelled out.
    expect(screen.getByText(formatDate('1998-07-24'))).toBeTruthy();
  });

  it('opens on the chosen date’s month and picks a day as YYYY-MM-DD', async () => {
    const onChange = jest.fn();
    await renderWithQuery(<Field initial="1998-07-24" onChange={onChange} />);
    await open();

    expect(screen.getByLabelText('Choose year')).toBeTruthy();
    fireEvent.press(day('1998-07-10'));

    expect(onChange).toHaveBeenCalledWith('1998-07-10');
    // The sheet closes on a choice.
    await waitFor(() => expect(screen.queryByLabelText('Choose year')).toBeNull());
  });

  it('walks to the previous and next month', async () => {
    const onChange = jest.fn();
    await renderWithQuery(<Field initial="1998-07-24" onChange={onChange} />);
    await open();

    fireEvent.press(screen.getByLabelText('Previous month'));
    fireEvent.press(await dayAfterRedraw('1998-06-05'));

    expect(onChange).toHaveBeenCalledWith('1998-06-05');
  });

  it('reaches a distant year through the year list, not the arrows', async () => {
    const onChange = jest.fn();
    await renderWithQuery(
      <Field initial="1998-07-24" min="1966-01-01" max="2016-12-31" onChange={onChange} />,
    );
    await open();

    fireEvent.press(screen.getByLabelText('Choose year'));
    // Nine years back: a hundred presses of the arrow, one tap here. The list
    // opens at the year already shown, so 1989 is on screen without scrolling.
    fireEvent.press(await screen.findByLabelText('1989'));
    fireEvent.press(await dayAfterRedraw('1989-07-24'));

    expect(onChange).toHaveBeenCalledWith('1989-07-24');
  });

  it('opens the year list at the year already shown, not at the newest', async () => {
    await renderWithQuery(<Field initial="1998-07-24" min="1966-01-01" max="2016-12-31" />);
    await open();

    fireEvent.press(screen.getByLabelText('Choose year'));

    expect(await screen.findByLabelText('1998')).toBeTruthy();
    // 2016 is the newest year in range and fifty rows away; it is not drawn.
    expect(screen.queryByLabelText('2016')).toBeNull();
  });

  it('will not offer a day outside the bounds', async () => {
    await renderWithQuery(<Field initial="2026-03-10" min="2026-03-05" max="2026-03-20" />);
    await open();

    expect(day('2026-03-04').props.accessibilityState.disabled).toBe(true);
    expect(day('2026-03-05').props.accessibilityState.disabled).toBe(false);
    expect(day('2026-03-21').props.accessibilityState.disabled).toBe(true);
  });

  it('will not walk past a month where every day is out of bounds', async () => {
    await renderWithQuery(<Field initial="2026-03-10" min="2026-03-01" max="2026-03-31" />);
    await open();

    expect(screen.getByLabelText('Previous month').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText('Next month').props.accessibilityState.disabled).toBe(true);
  });

  it('clears the date it holds', async () => {
    const onChange = jest.fn();
    await renderWithQuery(<Field initial="1998-07-24" onChange={onChange} />);
    await open();

    fireEvent.press(screen.getByText('Clear date'));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('offers nothing to clear when no date is held', async () => {
    await renderWithQuery(<Field />);
    await open();
    expect(screen.queryByText('Clear date')).toBeNull();
  });
});
