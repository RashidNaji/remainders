/**
 * Wallpaper Generation API Route
 * Minimalist Dot-Grid Redesign
 */

import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { YearView } from './year-view';
import { LifeView } from './life-view';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const width = parseInt(searchParams.get('width') || '1170');
    const height = parseInt(searchParams.get('height') || '2532');
    const isMondayFirst = searchParams.get('isMondayFirst') === 'true' || searchParams.get('isMondayFirst') === '1';
    const yearViewLayout = searchParams.get('yearViewLayout') === 'days' ? 'days' : 'months';
    const daysLayoutMode = searchParams.get('daysLayoutMode') === 'calendar' ? 'calendar' : 'continuous';
    const viewMode = searchParams.get('viewMode') || 'year';
    const birthDate = searchParams.get('birthDate') || '';

    let content;

    if (viewMode === 'life' && birthDate) {
      content = <LifeView width={width} height={height} birthDate={birthDate} />;
    } else {
      // Default to Year View
      content = <YearView width={width} height={height} isMondayFirst={isMondayFirst} yearViewLayout={yearViewLayout} daysLayoutMode={daysLayoutMode} />;
    }

    // Compute seconds remaining until midnight UTC so the cache expires
    // when the "current day" dot would change. Minimum 60s to avoid zero TTL.
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const secondsUntilMidnight = Math.max(60, Math.floor((midnight.getTime() - now.getTime()) / 1000));

    const imageResponse = new ImageResponse(content, { width, height });

    return new Response(imageResponse.body, {
      headers: {
        'Content-Type': 'image/png',
        // Cache until midnight UTC — the image changes when the current-day dot moves.
        // URL params form the cache key naturally (different configs = different URLs).
        'Cache-Control': `public, s-maxage=${secondsUntilMidnight}, stale-while-revalidate=60`,
      },
    });
  } catch (error) {
    console.error('Error generating wallpaper:', error);
    return new Response('Error generating wallpaper', { status: 500 });
  }
}
