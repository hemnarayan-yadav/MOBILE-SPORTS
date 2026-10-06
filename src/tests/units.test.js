import { uploadableImage } from '../utils/mediaFile.js';
import {
  changePasswordSchema,
  directPlayerSchema,
  playerSearchSchema,
  profileSchemaFor,
  registerProfileSchema,
} from '../utils/validation.js';
import { isVersionOlder } from '../utils/version.js';

describe('version comparison (forced update)', () => {
  it('compares versions part by part, numerically', () => {
    expect(isVersionOlder('0.1.0', '0.2.0')).toBe(true);
    expect(isVersionOlder('1.9.0', '1.10.0')).toBe(true);
    expect(isVersionOlder('1.10.0', '1.9.9')).toBe(false);
    expect(isVersionOlder('1.2.3', '1.2.3')).toBe(false);
  });

  it('never locks the app on a malformed value', () => {
    expect(isVersionOlder('0.1.0', 'garbage')).toBe(false);
    expect(isVersionOlder('0.1.0', undefined)).toBe(false);
  });
});

describe('picked photo', () => {
  const asset = { uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileSize: 1024, fileName: 'a.jpg' };

  it('becomes the { uri, name, type } React Native uploads', () => {
    expect(uploadableImage(asset, { maxImageMb: 5 })).toEqual({
      uri: 'file:///a.jpg',
      name: 'a.jpg',
      type: 'image/jpeg',
    });
    expect(
      uploadableImage({ ...asset, fileName: null, mimeType: 'image/png' }, { maxImageMb: 5 }).name,
    ).toBe('photo.png');
  });

  it('refuses what the API would refuse: HEIC and oversized files', () => {
    expect(() => uploadableImage({ ...asset, mimeType: 'image/heic' }, { maxImageMb: 5 })).toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED_FILE_TYPE' }),
    );
    expect(() =>
      uploadableImage({ ...asset, fileSize: 6 * 1024 * 1024 }, { maxImageMb: 5 }),
    ).toThrow(expect.objectContaining({ code: 'FILE_TOO_LARGE', details: { mb: 5 } }));
  });
});

describe('account forms (ported from the web)', () => {
  const signUp = {
    name: 'Asha',
    jerseyNumber: '7',
    email: '',
    password: 'kabaddi12',
    confirmPassword: 'kabaddi12',
  };

  it('requires matching passwords with a letter and a digit', () => {
    expect(registerProfileSchema.safeParse(signUp).success).toBe(true);
    expect(registerProfileSchema.safeParse({ ...signUp, confirmPassword: 'other123' }).success).toBe(
      false,
    );
    expect(
      registerProfileSchema.safeParse({
        ...signUp,
        password: 'onlyletters',
        confirmPassword: 'onlyletters',
      }).success,
    ).toBe(false);
  });

  // The jersey number is required at sign-up, and the birthday, height and
  // weight are not sign-up fields at all (API auth.validation.registerSchema).
  it('requires a jersey number in 0..99 at sign-up, and nothing else about the body', () => {
    expect(registerProfileSchema.safeParse({ ...signUp, jerseyNumber: '' }).success).toBe(false);
    expect(registerProfileSchema.safeParse({ ...signUp, jerseyNumber: '100' }).success).toBe(false);
    expect(registerProfileSchema.safeParse({ ...signUp, jerseyNumber: '0' }).success).toBe(true);
    const parsed = registerProfileSchema.parse({ ...signUp, dob: '1999-04-21', heightCm: '175' });
    expect(parsed.jerseyNumber).toBe(7);
    expect(parsed.dob).toBeUndefined();
    expect(parsed.heightCm).toBeUndefined();
  });

  it('keeps the phone of a player and the email of an organiser', () => {
    const player = { name: 'Asha', jerseyNumber: '7', email: '', phone: '', avatarUrl: '' };
    const organiser = { name: 'Asha', email: '', phone: '', avatarUrl: '' };
    expect(profileSchemaFor('user', { hasPhone: true }).safeParse(player).success).toBe(false);
    expect(profileSchemaFor('manager', { hasEmail: true }).safeParse(organiser).success).toBe(false);
    expect(profileSchemaFor('admin', { hasEmail: true }).safeParse(organiser).success).toBe(false);
    expect(
      profileSchemaFor('user', { hasPhone: true }).safeParse({ ...player, phone: '+919876543210' })
        .success,
    ).toBe(true);
    // An organiser has no player profile, so the schema never asks for a jersey
    // number and would not send one.
    expect(
      profileSchemaFor('manager', { hasEmail: true }).parse({
        ...organiser,
        email: 'a@b.com',
        jerseyNumber: '7',
      }).jerseyNumber,
    ).toBeUndefined();
  });

  // The player half of the profile: optional, and never blocking completion.
  it('accepts a profile with no birthday, height or weight, and refuses silly ones', () => {
    const schema = profileSchemaFor('user', { hasPhone: true });
    const base = {
      name: 'Asha',
      jerseyNumber: '7',
      email: '',
      phone: '+919876543210',
      avatarUrl: '',
      dob: '',
      heightCm: '',
      weightKg: '',
    };
    const parsed = schema.parse(base);
    expect(parsed.heightCm).toBeNull();
    expect(parsed.weightKg).toBeNull();
    expect(schema.safeParse({ ...base, heightCm: '40' }).success).toBe(false);
    expect(schema.safeParse({ ...base, weightKg: '500' }).success).toBe(false);
    expect(schema.safeParse({ ...base, dob: '21-04-1999' }).success).toBe(false);
    expect(schema.parse({ ...base, dob: '1999-04-21', heightCm: '175' }).heightCm).toBe(175);
  });

  it('asks the password change for the current password and a matching new one', () => {
    const base = { currentPassword: 'old12345', password: 'kabaddi12', confirmPassword: 'kabaddi12' };
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
    expect(changePasswordSchema.safeParse({ ...base, currentPassword: '' }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: 'other123' }).success).toBe(
      false,
    );
    expect(changePasswordSchema.safeParse({ ...base, password: 'short', confirmPassword: 'short' })
      .success).toBe(false);
  });

  // A player with no account, added straight into the squad: name, Indian
  // mobile number and jersey are required, the location is not.
  it('asks the direct add for a name, an Indian mobile and a jersey number', () => {
    const base = {
      name: 'Ravi Kumar',
      phone: '+919876543210',
      jerseyNumber: '12',
      playingRole: 'raider',
      state: '',
      district: '',
    };
    expect(directPlayerSchema.safeParse(base).success).toBe(true);
    expect(directPlayerSchema.safeParse({ ...base, phone: '+15551234567' }).success).toBe(false);
    expect(directPlayerSchema.safeParse({ ...base, jerseyNumber: '' }).success).toBe(false);
    expect(directPlayerSchema.safeParse({ ...base, name: 'R' }).success).toBe(false);
  });

  it('needs two characters before it searches for a player', () => {
    expect(playerSearchSchema.safeParse({ query: 'a' }).success).toBe(false);
    expect(playerSearchSchema.safeParse({ query: 'Ravi' }).success).toBe(true);
    expect(playerSearchSchema.safeParse({ query: ' 9876543210 ' }).data.query).toBe('9876543210');
  });
});
