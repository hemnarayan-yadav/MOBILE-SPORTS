// Ported from frontend/src/utils/noticeDraft.js — unchanged. The announce
// form has the same rows in the app as on the website, so a poster reading
// lands in the same places on both.
import { toLocationPayload } from './validation.js';

// Four is what a village poster offers: प्रथम, द्वितीय, तृतीय, चतुर्थ.
export const PRIZE_POSITIONS = Object.freeze([1, 2, 3, 4]);
export const AWARD_ROWS = 4;
export const CONTACT_ROWS = 3;

// What the reader says it had to assume. Each one names the field it is about,
// so the field itself carries the note and the organiser sees it where the
// correction has to be made.
const POSTER_WARNING_KEYS = Object.freeze({
  POSTER_DATE_MISSING: 'notices.posterWarning.dateMissing',
  POSTER_DATE_AMBIGUOUS: 'notices.posterWarning.dateAmbiguous',
  POSTER_DATE_ORDER_CORRECTED: 'notices.posterWarning.dateOrderCorrected',
  POSTER_DATE_WEEKDAY_MISMATCH: 'notices.posterWarning.dateWeekdayMismatch',
  POSTER_DATE_OUT_OF_ORDER: 'notices.posterWarning.dateOutOfOrder',
  POSTER_STATE_UNKNOWN: 'notices.posterWarning.stateUnknown',
  POSTER_DISTRICT_UNKNOWN: 'notices.posterWarning.districtUnknown',
  POSTER_PHONE_UNREADABLE: 'notices.posterWarning.phoneUnreadable',
});
const OTHER_WARNING_KEY = 'notices.posterWarning.other';

/** The translation key for a reader warning; an unknown code still reads. */
export const posterWarningKey = (code) => POSTER_WARNING_KEYS[code] ?? OTHER_WARNING_KEY;

/** The note for one field, or undefined where the reader was sure. */
export function posterWarningKeyFor(warnings, field) {
  const code = warnings?.find((warning) => warning.field === field)?.code;
  return code && POSTER_WARNING_KEYS[code] ? POSTER_WARNING_KEYS[code] : undefined;
}

// The plain text fields, which go straight across.
const DRAFT_TEXT_FIELDS = Object.freeze([
  'title',
  'description',
  'startDate',
  'endDate',
  'startTime',
  'venue',
  'entryFee',
  'rules',
  'organiserName',
]);

export const NOTICE_DEFAULTS = Object.freeze({
  title: '',
  posterUrl: '',
  description: '',
  startDate: '',
  endDate: '',
  startTime: '',
  venue: '',
  entryFee: '',
  rules: '',
  organiserName: '',
  prizes: PRIZE_POSITIONS.map(() => ''),
  awards: Array.from({ length: AWARD_ROWS }, () => ({ title: '', prize: '' })),
  contacts: Array.from({ length: CONTACT_ROWS }, () => ({ name: '', phone: '' })),
  state: '',
  district: '',
});

const isBlank = (value) => value === null || value === undefined || value === '';

/**
 * A reading as the form fields it fills: `[name, value]` pairs in the form's
 * own field names (`prizes.0`, `awards.1.title`), the location to set, and how
 * many entries had no row to go in. Blank values are left out, so applying the
 * pairs only ever fills a field and never clears what was typed by hand.
 */
export function draftFields(draft) {
  const fields = [];
  const put = (name, value) => {
    if (!isBlank(value)) fields.push([name, value]);
  };

  DRAFT_TEXT_FIELDS.forEach((name) => put(name, draft[name]));

  // The placings are four slots by position; a fifth placing has nowhere to go.
  draft.prizes.forEach(({ position, prize }) => {
    const index = PRIZE_POSITIONS.indexOf(position);
    if (index >= 0) put(`prizes.${index}`, prize);
  });
  draft.awards.slice(0, AWARD_ROWS).forEach((award, index) => {
    put(`awards.${index}.title`, award.title);
    put(`awards.${index}.prize`, award.prize);
  });
  draft.contacts.slice(0, CONTACT_ROWS).forEach((contact, index) => {
    put(`contacts.${index}.name`, contact.name);
    put(`contacts.${index}.phone`, contact.phone);
  });

  // Said plainly rather than dropped in silence.
  const dropped =
    draft.prizes.filter(({ position }) => !PRIZE_POSITIONS.includes(position)).length +
    Math.max(0, draft.awards.length - AWARD_ROWS) +
    Math.max(0, draft.contacts.length - CONTACT_ROWS);

  const location = draft.state ? { state: draft.state, district: draft.district ?? '' } : null;

  return { fields, location, dropped };
}

// Blank optional fields are left out entirely rather than sent as empty
// strings, so the API stores a null instead of an empty value.
const omitBlank = (value) => (value ? value : undefined);

/** The form's values as the API takes them. */
export function noticePayload(values) {
  return {
    title: values.title,
    startDate: values.startDate,
    endDate: omitBlank(values.endDate),
    posterUrl: omitBlank(values.posterUrl),
    description: omitBlank(values.description),
    startTime: omitBlank(values.startTime),
    venue: omitBlank(values.venue),
    entryFee: omitBlank(values.entryFee),
    rules: omitBlank(values.rules),
    organiserName: omitBlank(values.organiserName),
    ...(values.state ? { location: toLocationPayload(values) } : {}),
    // Only the rows actually filled in, in poster order.
    prizes: values.prizes
      .map((prize, index) => ({ position: PRIZE_POSITIONS[index], prize }))
      .filter((entry) => entry.prize),
    awards: values.awards.filter((award) => award.title && award.prize),
    contacts: values.contacts
      .filter((contact) => contact.phone)
      .map(({ name, phone }) => ({ name: omitBlank(name), phone })),
  };
}
