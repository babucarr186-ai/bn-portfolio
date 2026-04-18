/* global process */
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'ua-push';
const SUBSCRIPTION_PREFIX = 'subscriptions/';

function store() {
  // Strong consistency keeps subscribe + send flows predictable.
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

export function json(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

export function getBearerToken(event) {
  const raw =
    (event?.headers?.authorization || event?.headers?.Authorization || event?.headers?.AUTHORIZATION || '').trim();
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

export function requireAdminToken(event) {
  const expected = (process.env.PUSH_ADMIN_TOKEN || '').trim();
  if (!expected) {
    return { ok: false, reason: 'PUSH_ADMIN_TOKEN not configured' };
  }
  const got = getBearerToken(event);
  if (!got || got !== expected) {
    return { ok: false, reason: 'Unauthorized' };
  }
  return { ok: true };
}

export function normalizeSubscription(subscription) {
  if (!subscription || typeof subscription !== 'object') return null;

  const endpoint = typeof subscription.endpoint === 'string' ? subscription.endpoint.trim() : '';
  const keys = subscription.keys && typeof subscription.keys === 'object' ? subscription.keys : null;
  const p256dh = keys && typeof keys.p256dh === 'string' ? keys.p256dh.trim() : '';
  const auth = keys && typeof keys.auth === 'string' ? keys.auth.trim() : '';

  if (!endpoint) return null;

  // Some browsers could omit keys in weird cases; but for web-push sending we need them.
  // Keep validation lenient here; sender will skip unusable entries.
  const out = { endpoint };
  if (p256dh || auth) out.keys = { ...(p256dh ? { p256dh } : {}), ...(auth ? { auth } : {}) };

  // Preserve optional fields if present.
  if (typeof subscription.expirationTime !== 'undefined') out.expirationTime = subscription.expirationTime;

  return out;
}

export function subscriptionId(endpoint) {
  return crypto.createHash('sha256').update(String(endpoint)).digest('hex');
}

export function subscriptionKey(endpoint) {
  return `${SUBSCRIPTION_PREFIX}${subscriptionId(endpoint)}`;
}

export async function upsertSubscription({ subscription, userAgent }) {
  const normalized = normalizeSubscription(subscription);
  if (!normalized) return { ok: false, error: 'Invalid subscription' };

  const key = subscriptionKey(normalized.endpoint);
  const meta = {
    updatedAt: new Date().toISOString(),
    ...(userAgent ? { userAgent: String(userAgent).slice(0, 300) } : {}),
  };

  const existing = await store().getMetadata(key);
  if (existing && existing.metadata && existing.metadata.createdAt) {
    meta.createdAt = existing.metadata.createdAt;
  } else {
    meta.createdAt = new Date().toISOString();
  }

  await store().setJSON(key, normalized, { metadata: meta });

  return {
    ok: true,
    stored: true,
    id: subscriptionId(normalized.endpoint),
    alreadyExisted: Boolean(existing),
  };
}

export async function deleteSubscription({ subscription }) {
  const normalized = normalizeSubscription(subscription);
  if (!normalized) return { ok: false, error: 'Invalid subscription' };

  const key = subscriptionKey(normalized.endpoint);
  await store().delete(key);

  return { ok: true, deleted: true, id: subscriptionId(normalized.endpoint) };
}

export async function listSubscriptions() {
  const { blobs } = await store().list({ prefix: SUBSCRIPTION_PREFIX });
  return blobs;
}

export async function getSubscriptionByKey(key) {
  return await store().get(key, { type: 'json' });
}

export async function deleteSubscriptionByKey(key) {
  await store().delete(key);
}
