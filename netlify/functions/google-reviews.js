/* global process */
import { json } from './_pushStore.js';

const GOOGLE_PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const DEFAULT_REVIEW_LIMIT = 4;
const ALLOWED_ORIGINS = new Set([
  'https://uncleapplestore.com',
  'https://www.uncleapplestore.com',
]);

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

function normalizeReview(review) {
  return {
    authorName: trim(review?.author_name) || 'Google customer',
    profilePhotoUrl: trim(review?.profile_photo_url),
    rating: Number.isFinite(review?.rating) ? review.rating : 0,
    relativeTimeDescription: trim(review?.relative_time_description),
    text: trim(review?.text),
    time: Number.isFinite(review?.time) ? review.time : null,
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

  const url = new URL(GOOGLE_PLACE_DETAILS_URL);
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'name,rating,user_ratings_total,reviews,url');
  url.searchParams.set('reviews_sort', 'newest');
  url.searchParams.set('key', apiKey);

  let response;
  try {
    response = await fetch(url);
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

  if (payload?.status !== 'OK' || !payload?.result) {
    return json(502, {
      error: 'Google Places returned an error',
      status: payload?.status || 'UNKNOWN',
      message: trim(payload?.error_message),
    }, corsHeaders);
  }

  const result = payload.result;
  const reviews = Array.isArray(result.reviews)
    ? result.reviews
        .map(normalizeReview)
        .filter((review) => review.text)
        .slice(0, DEFAULT_REVIEW_LIMIT)
    : [];

  return json(
    200,
    {
      businessName: trim(result.name) || businessName,
      averageRating: Number.isFinite(result.rating) ? result.rating : null,
      totalRatings: Number.isFinite(result.user_ratings_total) ? result.user_ratings_total : null,
      reviews,
      writeReviewUrl: trim(result.url) || buildMapsUrl(placeId, businessName),
    },
    {
      ...corsHeaders,
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  );
}