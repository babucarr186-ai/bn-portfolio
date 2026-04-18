/* global process */
import crypto from 'node:crypto';
import webpush from 'web-push';
import { getStore } from '@netlify/blobs';

import { deleteSubscriptionByKey, getSubscriptionByKey, json, listSubscriptions } from './_pushStore.js';

const STORE_NAME = 'ua-push';
const SEEN_KEYS_BLOB = 'catalog/seen-keys-v2';

function store() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

function getHookToken(event) {
  const q = event?.queryStringParameters || {};
  const token = typeof q.token === 'string' ? q.token.trim() : '';
  if (token) return token;

  const raw =
    (event?.headers?.authorization || event?.headers?.Authorization || event?.headers?.AUTHORIZATION || '').trim();
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : '';
}

function requireDeployHookToken(event) {
  const expected = (process.env.PUSH_DEPLOY_HOOK_TOKEN || '').trim();
  if (!expected) {
    return { ok: false, reason: 'PUSH_DEPLOY_HOOK_TOKEN not configured' };
  }

  const got = getHookToken(event);
  if (!got || got !== expected) {
    return { ok: false, reason: 'Unauthorized' };
  }

  return { ok: true };
}

function getVapidKeys() {
  const publicKey =
    (process.env.VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY_B64URL || process.env.PUBLIC_VAPID_KEY || '').trim();
  const privateKey =
    (process.env.VAPID_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY_B64URL || process.env.PRIVATE_VAPID_KEY || '').trim();
  const subject = (process.env.VAPID_SUBJECT || 'mailto:admin@example.com').trim();

  return { publicKey, privateKey, subject };
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'cache-control': 'no-store' },
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, error: `Fetch failed: ${res.status} ${res.statusText}` };
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err?.name === 'AbortError' ? 'Fetch timeout' : err?.message || 'Fetch failed' };
  } finally {
    clearTimeout(timer);
  }
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function normalizeManifest(raw) {
  const products = Array.isArray(raw?.products) ? raw.products : [];

  const normalized = products
    .map((item) => {
      const key = typeof item?.key === 'string' ? item.key.trim() : '';
      const title = typeof item?.title === 'string' ? item.title.trim() : '';
      const url = typeof item?.url === 'string' ? item.url.trim() : '';
      const available = Boolean(item?.available);
      const sold = Boolean(item?.sold);
      const stockRemaining = Number(item?.stockRemaining);

      if (!key) return null;

      return {
        key,
        title: title || 'Product',
        url: url || '/',
        available,
        sold,
        stockRemaining: Number.isFinite(stockRemaining) ? stockRemaining : null,
      };
    })
    .filter(Boolean);

  return normalized;
}

async function loadSeenState() {
  const state = await store().get(SEEN_KEYS_BLOB, { type: 'json' });
  if (!state || typeof state !== 'object') {
    return { version: 1, keys: [], updatedAt: null, manifestHash: null };
  }

  const keys = Array.isArray(state.keys) ? state.keys.filter((k) => typeof k === 'string' && k.trim()) : [];
  const updatedAt = typeof state.updatedAt === 'string' ? state.updatedAt : null;
  const manifestHash = typeof state.manifestHash === 'string' ? state.manifestHash : null;

  return { version: 1, keys, updatedAt, manifestHash };
}

async function saveSeenState({ keys, manifestHash }) {
  await store().setJSON(SEEN_KEYS_BLOB, {
    version: 1,
    keys,
    manifestHash,
    updatedAt: new Date().toISOString(),
  });
}

function buildNotificationForProduct(product) {
  return {
    title: 'New Arrival at Uncle Apple Store',
    body: `${product.title} is now available. Tap to view.`,
    url: product.url || '/',
  };
}

async function sendToAllSubscriptions(payload) {
  const { publicKey, privateKey, subject } = getVapidKeys();
  if (!publicKey || !privateKey) {
    return {
      ok: false,
      error: 'VAPID keys are not configured',
      requiredEnv: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
    };
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const { blobs } = await listSubscriptions();

  const results = {
    ok: true,
    total: blobs.length,
    attempted: 0,
    sent: 0,
    skippedInvalid: 0,
    removedGone: 0,
    failed: 0,
  };

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
      await webpush.sendNotification(subscription, JSON.stringify(payload), {
        TTL: 60 * 60, // 1 hour
      });
      results.sent += 1;
    } catch (err) {
      const statusCode = err?.statusCode;

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
      console.log('push-deploy-hook send failed', {
        statusCode,
        name: err?.name,
        message: err?.message,
      });
    }
  }

  return results;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const auth = requireDeployHookToken(event);
  if (!auth.ok) {
    return json(401, { ok: false, error: 'Unauthorized' });
  }

  // Safety: only notify for production deploys.
  const context = String(process.env.CONTEXT || '').trim();
  if (context && context !== 'production') {
    return json(200, { ok: true, skipped: true, reason: `Context is ${context}` });
  }

  // Netlify provides URL for the currently deployed site.
  const siteUrl = (process.env.URL || '').trim();
  if (!siteUrl) {
    return json(500, { ok: false, error: 'Missing Netlify URL env (process.env.URL)' });
  }

  const manifestUrl = `${siteUrl.replace(/\/+$/, '')}/push-catalog.json?ts=${Date.now()}`;
  const fetched = await fetchJsonWithTimeout(manifestUrl, 8000);
  if (!fetched.ok) {
    return json(500, { ok: false, error: 'Failed to load push catalog manifest', manifestUrl, detail: fetched.error });
  }

  const manifestProducts = normalizeManifest(fetched.data);
  const currentKeys = manifestProducts.map((p) => p.key);
  const manifestHash = sha256Hex(currentKeys.slice().sort().join('\n'));

  const seenState = await loadSeenState();
  const seenSet = new Set(seenState.keys);

  // Bootstrap: first successful run should not notify for the entire existing catalog.
  if (!seenState.keys.length) {
    await saveSeenState({ keys: currentKeys, manifestHash });
    return json(200, {
      ok: true,
      bootstrapped: true,
      seenCount: currentKeys.length,
      sent: 0,
    });
  }

  // If this deploy snapshot is identical to what we already recorded, do nothing.
  if (seenState.manifestHash && seenState.manifestHash === manifestHash) {
    return json(200, { ok: true, skipped: true, reason: 'No catalog changes', sent: 0 });
  }

  const newKeys = currentKeys.filter((key) => !seenSet.has(key));
  const newKeySet = new Set(newKeys);

  const newAvailable = manifestProducts
    .filter((p) => newKeySet.has(p.key))
    .filter((p) => p.available && !p.sold)
    .filter((p) => p.stockRemaining === null || p.stockRemaining > 0);

  const MAX_NOTIFICATIONS = 5;
  const seenTitles = new Set();
  const uniqueByTitle = [];
  for (const product of newAvailable) {
    const titleKey = String(product.title || '').trim().toLowerCase();
    if (!titleKey) continue;
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);
    uniqueByTitle.push(product);
  }

  const toNotify = uniqueByTitle.slice(0, MAX_NOTIFICATIONS);

  // If we’re about to send, validate VAPID config first.
  if (toNotify.length) {
    const { publicKey, privateKey } = getVapidKeys();
    if (!publicKey || !privateKey) {
      return json(500, {
        ok: false,
        error: 'VAPID keys are not configured',
        requiredEnv: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
      });
    }
  }

  const sendSummaries = [];
  for (const product of toNotify) {
    const notif = buildNotificationForProduct(product);
    const result = await sendToAllSubscriptions(notif);

    if (!result.ok) {
      return json(500, {
        ok: false,
        error: result.error,
        requiredEnv: result.requiredEnv,
      });
    }

    sendSummaries.push({
      key: product.key,
      title: product.title,
      url: product.url,
      sent: result.sent,
      attempted: result.attempted,
      totalSubscriptions: result.total,
    });
  }

  // Mark new keys as “seen” even if they’re sold/out-of-stock, so later edits don’t trigger a push.
  const nextSeenKeys = Array.from(new Set([...seenState.keys, ...newKeys]));
  await saveSeenState({ keys: nextSeenKeys, manifestHash });

  return json(200, {
    ok: true,
    manifestUrl,
    seenBefore: seenState.keys.length,
    seenAfter: nextSeenKeys.length,
    newKeys: newKeys.length,
    newAvailable: newAvailable.length,
    notified: toNotify.length,
    notifications: sendSummaries,
    capped: uniqueByTitle.length > MAX_NOTIFICATIONS,
  });
}
