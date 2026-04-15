export async function handler() {
  const publicKey =
    (process.env.VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY_B64URL || process.env.PUBLIC_VAPID_KEY || '').trim();

  if (!publicKey) {
    return {
      statusCode: 404,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
      body: JSON.stringify({ error: 'VAPID public key not configured' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: JSON.stringify({ publicKey }),
  };
}
