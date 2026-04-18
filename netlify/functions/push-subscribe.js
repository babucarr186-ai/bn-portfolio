import { deleteSubscription, json, normalizeSubscription, upsertSubscription } from './_pushStore.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  let payload;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const action = payload && typeof payload.action === 'string' ? payload.action : 'subscribe';
  const subscription = payload && typeof payload.subscription === 'object' ? payload.subscription : null;

  const normalized = normalizeSubscription(subscription);
  if (!normalized) {
    return json(400, { ok: false, error: 'Missing or invalid subscription.endpoint' });
  }

  // Minimal logging (safe for production). Endpoint itself is considered sensitive.
  try {
    const u = new URL(normalized.endpoint);
    console.log('push-subscribe received', {
      action,
      endpointOrigin: u.origin,
      keysPresent: Boolean(normalized.keys && (normalized.keys.p256dh || normalized.keys.auth)),
    });
  } catch {
    console.log('push-subscribe received', {
      action,
      keysPresent: Boolean(normalized.keys && (normalized.keys.p256dh || normalized.keys.auth)),
    });
  }

  if (action === 'unsubscribe') {
    const res = await deleteSubscription({ subscription: normalized });
    if (!res.ok) return json(400, { ok: false, error: res.error || 'Could not unsubscribe' });
    return json(200, { ok: true, deleted: true, id: res.id });
  }

  if (action !== 'subscribe') {
    return json(400, { ok: false, error: 'Unsupported action' });
  }

  const result = await upsertSubscription({
    subscription: normalized,
    userAgent: payload && typeof payload.userAgent === 'string' ? payload.userAgent : '',
  });

  if (!result.ok) {
    return json(400, { ok: false, stored: false, error: result.error || 'Could not store subscription' });
  }

  return json(200, {
    ok: true,
    stored: true,
    id: result.id,
    alreadySubscribed: result.alreadyExisted,
  });
}
