// Ported from frontend/src/utils/validation.js — the account, team and squad
// schemas the app uses (unchanged). Client-side mirrors of the API's validation
// rules; messages are i18n keys, translated where the error is rendered. The
// API remains the authority.
import { z } from 'zod';
import { ORGANISER_ROLES } from './constants.js';
import { isKnownDistrict, isKnownState } from './india.js';

const PASSWORD_MIN_LENGTH = 8;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const INDIAN_MOBILE_PATTERN = /^\+91[6-9]\d{9}$/;
const FIRST_FOUNDED_YEAR = 1900;

const normalizePhone = (value) => value.replace(/[\s\-().]/g, '');

const nameField = z
  .string()
  .trim()
  .min(NAME_MIN_LENGTH, 'validation.nameMin')
  .max(NAME_MAX_LENGTH, 'validation.nameMax');

const emailField = z.string().trim().email('validation.emailInvalid');

const phoneField = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine((value) => PHONE_PATTERN.test(value), 'validation.phoneInvalid');

const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'validation.passwordMin')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'validation.passwordComplexity');

const urlField = z
  .string()
  .trim()
  .url('validation.urlInvalid')
  .refine((value) => /^https?:\/\//i.test(value), 'validation.urlInvalid');

const optionalField = (schema) => z.union([z.literal(''), schema]);

// The state/district pair as the forms hold it: flat strings, "" for "not
// chosen". Both default to "" so a caller with no location to give — an add
// form, a schema reused without the pickers — parses exactly as before.
const locationFields = {
  state: z
    .union([z.literal(''), z.string().refine(isKnownState, 'validation.stateUnknown')])
    .default(''),
  district: z.string().trim().max(80, 'validation.tooLong').default(''),
};

// A district only exists inside its state. StateDistrictFields already clears
// the district when the state changes, so this is the backstop for a pair that
// reached the schema some other way.
const checkLocation = (values, ctx) => {
  if (values.district && !values.state) {
    ctx.addIssue({ code: 'custom', path: ['district'], message: 'validation.districtNeedsState' });
  } else if (values.state && values.district && !isKnownDistrict(values.state, values.district)) {
    ctx.addIssue({ code: 'custom', path: ['district'], message: 'validation.districtNotInState' });
  }
};

const withLocation = (schema) => schema.superRefine(checkLocation);

// Form values → the API's nested shape. "" clears the field on the server.
export const toLocationPayload = ({ state, district }) => ({
  state: state || null,
  district: district || null,
});

// The API's nested shape → form values.
export const toLocationValues = (location) => ({
  state: location?.state ?? '',
  district: location?.district ?? '',
});
const optionalUrl = optionalField(urlField);
const text = (max) => z.string().trim().max(max, 'validation.tooLong');

// Number inputs arrive as strings; "" means "not set".
const optionalNumber = (schema) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    z.union([z.null(), schema]),
  );
// <PhoneField /> already composes E.164 from the picked country code, so this
// only checks the result.
const requiredPhoneField = z
  .string()
  .trim()
  .min(1, 'validation.phoneRequired')
  .regex(PHONE_PATTERN, 'validation.phoneInvalid');

// OTP flows are India-only, matching the API.
const indianMobileField = requiredPhoneField.regex(INDIAN_MOBILE_PATTERN, 'validation.phoneIndia');

// The shirt number a player is known by: asked for at sign-up and kept on the
// profile, so it is defined before the schemas that need it. Text, not a
// number, so the shirt keeps its leading zero — "08" is the number worn, not 8
// — and the API stores exactly what was typed. A number that reaches the schema
// from saved data is read as its digits.
const JERSEY_PATTERN = /^\d{1,2}$/;
const jerseyField = z.preprocess(
  (value) => (typeof value === 'number' ? String(value) : value),
  z
    .string({ required_error: 'validation.required' })
    .trim()
    .min(1, 'validation.required')
    .regex(JERSEY_PATTERN, 'validation.jersey'),
);

// The measurements a player profile carries, shared by the player forms and the
// account's own profile screen. All three are optional and never block profile
// completion (API modules/users/profileState.js).
const sportsFields = {
  // "" means "not set", like the optional numbers below, so a caller with no
  // birthday to give parses exactly as one that cleared it.
  dob: z
    .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.date')])
    .default(''),
  heightCm: optionalNumber(
    z
      .number({ invalid_type_error: 'validation.number' })
      .int()
      .min(100, 'validation.height')
      .max(250, 'validation.height'),
  ),
  weightKg: optionalNumber(
    z
      .number({ invalid_type_error: 'validation.number' })
      .min(30, 'validation.weight')
      .max(200, 'validation.weight'),
  ),
};

const passwordsMatch = (values) => values.password === values.confirmPassword;
const passwordMismatch = { path: ['confirmPassword'], message: 'validation.passwordMismatch' };

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'validation.required'),
  password: z.string().min(1, 'validation.required'),
});

export const otpLoginSchema = z.object({ phone: indianMobileField });

// Signing up happens in two steps: the number alone (an Indian mobile, proved
// by a one-time code), then the rest of the account, where the email is
// genuinely optional.
export const registerPhoneSchema = z.object({ phone: indianMobileField });

// The jersey number is part of who a player is on a kabaddi team, so signing up
// asks for it (API auth.validation.registerSchema). Birthday, height and weight
// are not sign-up fields — they are filled in later, on the profile.
export const registerProfileSchema = withLocation(
  z
    .object({
      name: nameField,
      jerseyNumber: jerseyField,
      email: optionalField(emailField),
      password: passwordField,
      confirmPassword: z.string(),
      ...locationFields,
    })
    .refine(passwordsMatch, passwordMismatch),
);

// Resetting by email: the address, then the code, then the new password.
export const emailResetSchema = z
  .object({ email: emailField, password: passwordField, confirmPassword: z.string() })
  .refine(passwordsMatch, passwordMismatch);

export const phoneResetSchema = z
  .object({ phone: indianMobileField, password: passwordField, confirmPassword: z.string() })
  .refine(passwordsMatch, passwordMismatch);

export const changePhoneSchema = z.object({ phone: indianMobileField });

// Which contact an account must keep depends on its role: organisers (Admin,
// Manager, Super Admin) are recovered by email, everyone else is reached on the
// phone — and only for a contact the account already has (mirrors
// contactRequirement() on the API).
export function profileSchemaFor(role, { hasPhone = false, hasEmail = false } = {}) {
  const organiser = ORGANISER_ROLES.includes(role);
  const mustKeepEmail = organiser && hasEmail;
  const mustKeepPhone = !organiser && hasPhone;

  return z
    .object({
      name: nameField,
      email: mustKeepEmail ? emailField : optionalField(emailField),
      phone: mustKeepPhone ? requiredPhoneField : optionalField(phoneField),
      avatarUrl: optionalField(urlField),
      // The player half of the account (PATCH /users/me writes it to the
      // player profile). An organiser has no player profile, so the form does
      // not show these and the schema does not ask for them.
      ...(organiser ? {} : { jerseyNumber: jerseyField, ...sportsFields }),
      ...locationFields,
    })
    .refine((values) => Boolean(values.email || values.phone), {
      path: ['phone'],
      message: 'validation.contactRequired',
    })
    .superRefine(checkLocation);
}

// Replacing your own password: the current one is always required, including
// for an account still holding the temporary password it was created with
// (API POST /users/me/password).
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'validation.required'),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, passwordMismatch);

export const teamSchema = withLocation(
  z.object({
    name: z.string().trim().min(2, 'validation.teamNameMin').max(80, 'validation.tooLong'),
    shortName: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{2,5}$/, 'validation.shortName'),
    city: text(80),
    homeGround: text(120),
    foundedYear: optionalNumber(
      z
        .number({ invalid_type_error: 'validation.number' })
        .int('validation.number')
        .min(FIRST_FOUNDED_YEAR, 'validation.foundedYear')
        .max(new Date().getFullYear(), 'validation.foundedYear'),
    ),
    description: text(1000),
    logoUrl: optionalUrl,
    bannerUrl: optionalUrl,
    ...locationFields,
  }),
);

const roleField = z.enum(['raider', 'defender', 'all_rounder'], {
  errorMap: () => ({ message: 'validation.required' }),
});

const profileFields = {
  photoUrl: optionalUrl,
  ...sportsFields,
  hometown: text(80),
  bio: text(500),
  ...locationFields,
};

export const playerProfileSchema = withLocation(z.object({ name: nameField, ...profileFields }));
export const membershipSchema = z.object({ jerseyNumber: jerseyField, playingRole: roleField });

// A player who has no account yet, added straight into the squad
// (POST /teams/:teamId/players/direct). Name, number and jersey are required;
// the state and district are not. This replaced inviting a player by WhatsApp.
export const directPlayerSchema = withLocation(
  z.object({
    name: nameField,
    phone: indianMobileField,
    jerseyNumber: jerseyField,
    playingRole: roleField,
    ...locationFields,
  }),
);

// Finding a player who already has an account, by name or by mobile number
// (POST /users/search). Two characters is the API's own minimum.
export const playerSearchSchema = z.object({
  query: z.string().trim().min(2, 'app.searchMin').max(100, 'validation.tooLong'),
});

// Converts form strings to API payload values: "" → null for optional fields.
export function blankToNull(values, keys) {
  const result = { ...values };
  keys.forEach((key) => {
    if (result[key] === '') result[key] = null;
  });
  return result;
}
