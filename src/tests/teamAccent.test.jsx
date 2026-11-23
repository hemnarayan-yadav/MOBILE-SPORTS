jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { launchImageLibraryAsync } from 'expo-image-picker';
import TeamForm, { toTeamFormValues } from '../components/team/TeamForm.jsx';
import { TeamCard, TeamHero } from '../components/team/TeamBits.jsx';
import { fakeApi, ok, renderWithQuery } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(20_000);

// A team's accent colour in the app: suggested by an uploaded logo, changed
// with a swatch, and drawn on the team's card and page.
const TEAM = {
  id: 't1',
  name: 'Biroda King',
  shortName: 'BK',
  status: 'active',
  logoUrl: null,
  bannerUrl: null,
  accentColor: null,
  city: 'Rohtak',
  homeGround: 'Biroda Ground',
  squadCount: 9,
  location: {},
};

let api;

afterEach(() => api?.restore());

describe('the team colour in the team form', () => {
  beforeEach(() => {
    api = fakeApi(({ url }) => {
      if (url === '/media/config') return ok({ enabled: true, maxImageMb: 5, maxVideoMb: 50 });
      if (url === '/media/upload') return ok({ url: 'https://cdn.test/logo.png', accentColor: '#c81e1e' }, 201);
      return ok({});
    });
  });

  it('takes the colour the uploaded logo suggests', async () => {
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///logo.png', mimeType: 'image/png', fileName: 'logo.png', fileSize: 1000 }],
    });
    const onSubmit = jest.fn();
    await renderWithQuery(<TeamForm defaultValues={toTeamFormValues(TEAM)} onSubmit={onSubmit} submitLabel="Save" />);

    const [logoUpload] = await screen.findAllByRole('button', { name: 'Upload' });
    await waitFor(() => expect(logoUpload).toBeEnabled());
    await fireEvent.press(logoUpload);
    await waitFor(() => expect(screen.getByRole('radio', { name: '#c81e1e' })).toBeChecked());

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ accentColor: '#c81e1e' })));
  });

  it('lets a jersey colour be picked, and the default brought back', async () => {
    const onSubmit = jest.fn();
    await renderWithQuery(
      <TeamForm defaultValues={toTeamFormValues({ ...TEAM, accentColor: '#c81e1e' })} onSubmit={onSubmit} submitLabel="Save" />,
    );

    await fireEvent.press(await screen.findByRole('radio', { name: '#1565c0' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ accentColor: '#1565c0' })));

    await fireEvent.press(screen.getByRole('button', { name: 'Use default' }));
    expect(screen.getByText('Default')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ accentColor: '' })));
  });
});

describe('the team colour on show', () => {
  beforeEach(() => {
    api = fakeApi(() => ok({}));
  });

  it('edges the team card in the colour', async () => {
    const { toJSON } = await renderWithQuery(<TeamCard team={{ ...TEAM, accentColor: '#1a6be0' }} />);
    const edged = (node) =>
      Boolean(node) &&
      (StyleSheet.flatten(node.props?.style)?.borderLeftColor === '#1a6be0' ||
        (node.children ?? []).some((child) => typeof child === 'object' && edged(child)));
    expect(edged(toJSON())).toBe(true);
  });

  it('fills the team page hero with the colour when there is no banner', async () => {
    const { toJSON } = await renderWithQuery(<TeamHero team={{ ...TEAM, accentColor: '#1a6be0' }} />);
    expect(StyleSheet.flatten(toJSON().props.style).backgroundColor).toBe('#1a6be0');
  });

  it('ignores a value that is not a colour', async () => {
    const { toJSON } = await renderWithQuery(<TeamHero team={{ ...TEAM, accentColor: 'url(x)' }} />);
    expect(StyleSheet.flatten(toJSON().props.style).backgroundColor).not.toBe('url(x)');
  });
});
