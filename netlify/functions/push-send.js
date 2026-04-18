/* global process */
import webpush from 'web-push';
import { deleteSubscriptionByKey, getSubscriptionByKey, json, listSubscriptions, requireAdminToken } from './_pushStore.js';

function getVapidKeys() {
  const publicKey =
    (process.env.VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY_B64URL || process.env.PUBLIC_VAPID_KEY || '').trim();
  const privateKey =
    (process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY_B64URL || process.env.PRIVATE_VAPID_KEY || '').trim();
  const subject = (process.env.VAPID_SUBJECT || 'mailto:admin@example.com').trim();

  return { publicKey, privateKey, subject };
}

function normalizeSendPayload(payload) {
  const title = typeof payload?.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
  const url = typeof payload?.url === 'string' ? payload.url.trim() : '';

  return {
    title: title || 'Uncle Apple Store',
    body: body || 'New arrivals are available.',
    url: url || '/',
  };
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const auth = requireAdminToken(event);
  if (!auth.ok) {
    // Don’t leak whether the token is missing vs wrong.
    return json(401, { ok: false, error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  const sendPayload = normalizeSendPayload(payload);
  const { publicKey, privateKey, subject } = getVapidKeys();

  if (!publicKey || !privateKey) {
    return json(500, {
      ok: false,
      error: 'VAPID keys are not configured',
      requiredEnv: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
    });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { blobs } = await listSubscriptions();
  const total = blobs.length;

  const results = {
    ok: true,
    total,
    attempted: 0,
    sent: 0,
    skippedInvalid: 0,
    removedGone: 0,
    failed: 0,
  };

  // Sequential sending keeps the function simpler + avoids blasting providers.
  for (const blob of blobs) {
    const key = blob.key;
    const subscription = await getSubscriptionByKey(key);

    if (!subscription || typeof subscription !== 'object') {
      results.skippedInvalid += 1;
      continue;
    }

    const keys = subscription.keys && typeof subscription.keys === 'object' ? subscription.keys : null;
    const hasRequiredKeys = Boolean(keys && typeof keys.p256dh === 'string' && typeof keys.auth === 'string');
    if (!subscription.endpoint || !hasRequiredKeys) {
      results.skippedInvalid += 1;
      continue;
    }

    results.attempted += 1;

    try {
      await webpush.sendNotification(subscription, JSON.stringify(sendPayload), {
        TTL: 60 * 60, // 1 hour
      });
      results.sent += 1;
    } catch (err) {
      const statusCode = err?.statusCode;

      // 404/410 means the subscription is gone; remove it so future sends are fast.
      if (statusCode === 404 || statusCode === 410) {
        try {
          await deleteSubscriptionByKey(key);
          results.removedGone += 1;
        } catch {
          results.failed += 1;
        }
        continue;
      }

      results.failed += 1;
      // Log minimal diagnostics (no endpoints/keys).
      console.log('push-send failed', {
        statusCode,
        name: err?.name,
        message: err?.message,
      });
    }
  }

  return json(200, results);
}
