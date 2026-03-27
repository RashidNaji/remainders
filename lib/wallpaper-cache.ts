/**
 * Wallpaper caching — Firebase Storage backed, config-hash keyed.
 *
 * Cache key = SHA-256 of (username + canonical config JSON + YYYY-MM-DD in user's timezone).
 * The date component ensures the cache naturally expires at midnight in the user's local time,
 * so daily-changing views (year view, life view week progress) always regenerate the next day.
 *
 * Cache is invalidated immediately when the user saves their config (saveUserConfig clears
 * the cacheHash field from the config doc).
 */

import { createHash } from 'crypto';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';

/** Fields to exclude from the cache hash (they don't affect image output). */
const EXCLUDE_FROM_HASH = new Set(['cacheHash', 'cachePath', 'updatedAt', 'lastActiveAt']);

/**
 * Produces a stable SHA-256 hex digest for the given config + context.
 * Sorts keys so insertion order doesn't affect the hash.
 */
export function computeWallpaperHash(
  username: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>,
  dateStr: string  // YYYY-MM-DD in user's timezone
): string {
  const relevant: Record<string, any> = {};
  for (const [k, v] of Object.entries(config)) {
    if (!EXCLUDE_FROM_HASH.has(k)) relevant[k] = v;
  }
  const canonical = JSON.stringify(relevant, Object.keys(relevant).sort());
  return createHash('sha256')
    .update(`${username}|${dateStr}|${canonical}`)
    .digest('hex');
}

const CACHE_BUCKET_PREFIX = 'wallpaper_cache';

/** Upload the generated PNG to Storage and record the hash in the config doc. */
export async function storeWallpaperCache(
  username: string,
  hash: string,
  imageBuffer: Buffer
): Promise<void> {
  const storage = getAdminStorage();
  const db = getAdminFirestore();
  if (!storage || !db) return;

  const path = `${CACHE_BUCKET_PREFIX}/${username}/${hash}.png`;

  try {
    const bucket = storage.bucket();
    const file = bucket.file(path);
    await file.save(imageBuffer, { contentType: 'image/png', public: false });

    await db.collection('configs').doc(username.toLowerCase()).update({
      cacheHash: hash,
      cachePath: path,
    });
  } catch (err) {
    // Cache write failures are non-fatal — the image was already returned to the client.
    console.error('wallpaper-cache: failed to store cache', err);
  }
}

/**
 * Attempt to load a cached PNG from Storage.
 * Returns a Buffer on cache hit, or null on miss/error.
 */
export async function loadWallpaperCache(
  cachePath: string
): Promise<Buffer | null> {
  const storage = getAdminStorage();
  if (!storage) return null;

  try {
    const file = storage.bucket().file(cachePath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    return buffer;
  } catch {
    return null;
  }
}

/** Delete all cached PNGs for a user (called on cache invalidation). */
export async function deleteWallpaperCache(username: string): Promise<void> {
  const storage = getAdminStorage();
  if (!storage) return;
  try {
    await storage.bucket().deleteFiles({
      prefix: `${CACHE_BUCKET_PREFIX}/${username}/`,
    });
  } catch {
    // Best-effort
  }
}

