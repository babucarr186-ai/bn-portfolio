import { json, listSubscriptions, requireAdminToken } from './_pushStore.js';

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  }

  const auth = requireAdminToken(event);
  if (!auth.ok) {
    return json(401, { ok: false, error: 'Unauthorized' });
  }

  const { blobs } = await listSubscriptions();

  // Return only non-sensitive identifiers.
  const ids = blobs.map((b) => {
    const key = String(b.key || '');
    const parts = key.split('/');
    return parts[parts.length - 1];
  });

  return json(200, {
    ok: true,
    count: blobs.length,
    ids,
  });
}
