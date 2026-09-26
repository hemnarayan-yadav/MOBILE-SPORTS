// Ported from frontend/src/utils/validation.js — the account schemas the app
// uses so far (unchanged). Client-side mirrors of the API's validation rules;
// messages are i18n keys, translated where the error is rendered. The API
// remains the authority.
import { z } from 'zod';
import { MANAGER_ROLES } from './constants.js';

const PASSWORD_MIN_LENGTH = 8;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const INDIAN_MOBILE_PATTERN = /^\+91[6-9]\d{9}$/;

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

// <PhoneField /> already composes E.164 from the picked country code, so this
// only checks the result.
const requiredPhoneField = z
  .string()
  .trim()
  .min(1, 'validation.phoneRequired')
  .regex(PHONE_PATTERN, 'validation.phoneInvalid');

// OTP flows are India-only, matching the API.
const indianMobileField = requiredPhoneField.regex(INDIAN_MOBILE_PATTERN, 'validation.phoneIndia');

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

export const registerProfileSchema = z
  .object({
    name: nameField,
    email: optionalField(emailField),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(passwordsMatch, passwordMismatch);

// Resetting by email: the address, then the code, then the new password.
export const emailResetSchema = z
  .object({ email: emailField, password: passwordField, confirmPassword: z.string() })
  .refine(passwordsMatch, passwordMismatch);

export const phoneResetSchema = z
  .object({ phone: indianMobileField, password: passwordField, confirmPassword: z.string() })
  .refine(passwordsMatch, passwordMismatch);

export const changePhoneSchema = z.object({ phone: indianMobileField });

// Which contact an account must keep depends on its role: managers are
// recovered by email, everyone else is reached on the phone — and only for a
// contact the account already has (mirrors contactRequirement() on the API).
export function profileSchemaFor(role, { hasPhone = false, hasEmail = false } = {}) {
  const manager = MANAGER_ROLES.includes(role);
  const mustKeepEmail = manager && hasEmail;
  const mustKeepPhone = !manager && hasPhone;

  return z
    .object({
      name: nameField,
      email: mustKeepEmail ? emailField : optionalField(emailField),
      phone: mustKeepPhone ? requiredPhoneField : optionalField(phoneField),
      avatarUrl: optionalField(urlField),
    })
    .refine((values) => Boolean(values.email || values.phone), {
      path: ['phone'],
      message: 'validation.contactRequired',
    });
}
