jest.mock('../api/client.js', () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ data: { success: true, data: { draft: {} } } }),
  },
  unwrap: (res) => res.data.data,
}));

import { apiClient } from '../api/client.js';
import { noticesApi } from '../api/notices.api.js';

// Reading a poster can outlast the client's usual 15 s — the server waits up
// to 90 s for the model — and giving up first showed "Can't reach the server"
// while the reading was still going.
describe('reading a poster', () => {
  it('waits longer than the server may take, and only for this call', async () => {
    await noticesApi.extractPoster('6ab399eb995024308e988299');

    const [url, body, config] = apiClient.post.mock.calls[0];
    expect(url).toBe('/tournament-notices/extract-poster');
    expect(body).toEqual({ assetId: '6ab399eb995024308e988299' });
    expect(config.timeout).toBeGreaterThanOrEqual(100_000);
  });
});
