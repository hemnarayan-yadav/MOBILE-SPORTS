import { uploadableImage } from '../utils/mediaFile.js';
import { profileSchemaFor, registerProfileSchema } from '../utils/validation.js';
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
  it('requires matching passwords with a letter and a digit', () => {
    const base = { name: 'Asha', email: '', password: 'kabaddi12', confirmPassword: 'kabaddi12' };
    expect(registerProfileSchema.safeParse(base).success).toBe(true);
    expect(registerProfileSchema.safeParse({ ...base, confirmPassword: 'other123' }).success).toBe(
      false,
    );
    expect(
      registerProfileSchema.safeParse({
        ...base,
        password: 'onlyletters',
        confirmPassword: 'onlyletters',
      }).success,
    ).toBe(false);
  });

  it('keeps the phone of a user and the email of a manager', () => {
    const values = { name: 'Asha', email: '', phone: '', avatarUrl: '' };
    expect(profileSchemaFor('user', { hasPhone: true }).safeParse(values).success).toBe(false);
    expect(profileSchemaFor('admin', { hasEmail: true }).safeParse(values).success).toBe(false);
    expect(
      profileSchemaFor('user', { hasPhone: true }).safeParse({ ...values, phone: '+919876543210' })
        .success,
    ).toBe(true);
  });
});
