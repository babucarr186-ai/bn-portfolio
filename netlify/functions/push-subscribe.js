function json(statusCode, data, extraHeaders = {}) {
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

  const subscription = payload && typeof payload.subscription === 'object' ? payload.subscription : null;
  const endpoint = subscription && typeof subscription.endpoint === 'string' ? subscription.endpoint : '';

  if (!endpoint) {
    return json(400, { error: 'Missing subscription.endpoint' });
  }

  // NOTE: This endpoint currently does NOT persist subscriptions.
  // To enable real "new arrivals" push alerts, you must store subscriptions
  // in a database/kv store and send pushes server-side using your VAPID private key.

  try {
    const u = new URL(endpoint);
    console.log('push-subscribe received', {
      action: payload && typeof payload.action === 'string' ? payload.action : 'unknown',
      endpointOrigin: u.origin,
      endpointLength: endpoint.length,
      keysPresent: Boolean(subscription && subscription.keys),
    });
  } catch {
    console.log('push-subscribe received', {
      action: payload && typeof payload.action === 'string' ? payload.action : 'unknown',
      endpointLength: endpoint.length,
      keysPresent: Boolean(subscription && subscription.keys),
    });
  }

  return json(200, {
    ok: true,
    stored: false,
    message: 'Received subscription, but storage is not configured yet.',
  });
}
