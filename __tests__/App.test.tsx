/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// CI must never depend on the network — every screen fans out to installed
// addons via these two modules, so mocking them here is enough to keep the
// whole app tree offline and deterministic (02-Phase2-API-Integration.md's
// "no backend, no network dependency for tests" intent).
jest.mock('../src/lib/addons/manifest', () => ({
  AddonManifestError: class AddonManifestError extends Error {},
  fetchManifest: jest.fn().mockResolvedValue({
    id: 'com.linvo.cinemeta',
    name: 'Cinemeta',
    version: '1.4.0',
    resources: ['catalog', 'meta'],
    types: ['movie', 'series'],
    catalogs: [
      { type: 'movie', id: 'top', name: 'Popular', extraSupported: ['search', 'skip', 'genre'] },
      { type: 'series', id: 'top', name: 'Popular', extraSupported: ['search', 'skip', 'genre'] },
    ],
  }),
}));

jest.mock('../src/lib/addons/api', () => ({
  AddonRequestError: class AddonRequestError extends Error {},
  fetchCatalog: jest.fn().mockResolvedValue([]),
  fetchMeta: jest.fn().mockResolvedValue(null),
}));

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
