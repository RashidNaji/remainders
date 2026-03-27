import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/verify-admin';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const caller = await verifyAdminRequest(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const now = Date.now();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const snapshot = await db
    .collection('wallpaper_events')
    .where('timestamp', '>=', thirtyDaysAgo)
    .orderBy('timestamp', 'desc')
    .limit(20000)
    .get();

  const events = snapshot.docs.map(d => {
    const data = d.data();
    const ts = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
    return {
      type: data.type as 'user' | 'anonymous',
      username: data.username as string | undefined,
      viewMode: data.viewMode as string,
      timestamp: ts,
    };
  });

  const in24h = events.filter(e => e.timestamp >= oneDayAgo);
  const in7d = events.filter(e => e.timestamp >= sevenDaysAgo);
  const in30d = events;

  const uniqueUsers = (evts: typeof events) =>
    new Set(evts.filter(e => e.type === 'user' && e.username).map(e => e.username)).size;

  // Top users by request count (30d)
  const userCounts: Record<string, number> = {};
  for (const e of in30d) {
    if (e.type === 'user' && e.username) {
      userCounts[e.username] = (userCounts[e.username] || 0) + 1;
    }
  }
  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([username, count]) => ({ username, count }));

  // Daily breakdown for last 14 days
  const dailyMap: Record<string, { user: number; anonymous: number }> = {};
  for (const e of events) {
    const day = e.timestamp.toISOString().slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { user: 0, anonymous: 0 };
    dailyMap[day][e.type]++;
  }
  const daily = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, counts]) => ({ date, ...counts }));

  return NextResponse.json({
    requests: {
      '24h': in24h.length,
      '7d': in7d.length,
      '30d': in30d.length,
    },
    users: {
      '24h': uniqueUsers(in24h),
      '7d': uniqueUsers(in7d),
      '30d': uniqueUsers(in30d),
    },
    anonymous: {
      '24h': in24h.filter(e => e.type === 'anonymous').length,
      '7d': in7d.filter(e => e.type === 'anonymous').length,
      '30d': in30d.filter(e => e.type === 'anonymous').length,
    },
    topUsers,
    daily,
  });
}
