/* global process */
import { json } from './_pushStore.js';

const GOOGLE_PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';
const DEFAULT_REVIEW_LIMIT = 4;
const ALLOWED_ORIGINS = new Set([
  'https://uncleapplestore.com',
  'https://www.uncleapplestore.com',
]);

const GOOGLE_PLACE_FIELD_MASK = [
  'displayName',
  'rating',
  'userRatingCount',
  'reviews',
  'googleMapsLinks',
].join(',');

function trim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildCorsHeaders(origin) {
  const normalizedOrigin = trim(origin);
  if (!ALLOWED_ORIGINS.has(normalizedOrigin)) return {};

  return {
    'access-control-allow-origin': normalizedOrigin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Accept',
    vary: 'Origin',
  };
}

function getConfig() {
  return {
    placeId: trim(process.env.GOOGLE_REVIEWS_PLACE_ID || process.env.GOOGLE_PLACE_ID),
    apiKey: trim(process.env.GOOGLE_REVIEWS_API_KEY || process.env.GOOGLE_PLACES_API_KEY),
    businessName: trim(process.env.GOOGLE_REVIEWS_BUSINESS_NAME) || 'Uncle Apple',
  };
}

function buildMapsUrl(placeId, businessName) {
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(`${businessName} reviews`)}`;
}

function toUnixTimeSeconds(value) {
  const timestamp = Date.parse(trim(value));
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : null;
}

function normalizeReview(review) {
  return {
    authorName: trim(review?.authorAttribution?.displayName) || 'Google customer',
    profilePhotoUrl: trim(review?.authorAttribution?.photoUri),
    rating: Number.isFinite(review?.rating) ? review.rating : 0,
    relativeTimeDescription: trim(review?.relativePublishTimeDescription),
    text: trim(review?.originalText?.text) || trim(review?.text?.text),
    time: toUnixTimeSeconds(review?.publishTime),
  };
}

export async function handler(event) {
  const corsHeaders = buildCorsHeaders(event?.headers?.origin || event?.headers?.Origin);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...corsHeaders,
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method not allowed' }, { Allow: 'GET', ...corsHeaders });
  }

  const { placeId, apiKey, businessName } = getConfig();
  if (!placeId || !apiKey) {
    return json(503, {
      error: 'Google Reviews is not configured',
      requiredEnv: ['GOOGLE_REVIEWS_PLACE_ID', 'GOOGLE_REVIEWS_API_KEY'],
    }, corsHeaders);
  }

  const url = new URL(`${GOOGLE_PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}`);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GOOGLE_PLACE_FIELD_MASK,
        Accept: 'application/json',
      },
    });
  } catch (error) {
    console.log('google-reviews fetch failed', { message: error?.message });
    return json(502, { error: 'Unable to reach Google Places' }, corsHeaders);
  }

  if (!response.ok) {
    return json(502, {
      error: 'Google Places request failed',
      status: response.status,
    }, corsHeaders);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return json(502, { error: 'Invalid Google Places response' }, corsHeaders);
  }

  if (!response.ok || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return json(502, {
      error: 'Google Places returned an error',
      status: trim(payload?.error?.status) || 'UNKNOWN',
      message: trim(payload?.error?.message),
    }, corsHeaders);
  }

  const reviews = Array.isArray(payload.reviews)
    ? payload.reviews
        .map(normalizeReview)
        .filter((review) => review.text)
        .slice(0, DEFAULT_REVIEW_LIMIT)
    : [];

  return json(
    200,
    {
      businessName: trim(payload?.displayName?.text) || businessName,
      averageRating: Number.isFinite(payload?.rating) ? payload.rating : null,
      totalRatings: Number.isFinite(payload?.userRatingCount) ? payload.userRatingCount : null,
      reviews,
      writeReviewUrl: trim(payload?.googleMapsLinks?.writeAReviewUri) || buildMapsUrl(placeId, businessName),
    },
    {
      ...corsHeaders,
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  );
}