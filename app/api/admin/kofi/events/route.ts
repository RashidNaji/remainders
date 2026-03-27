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

  const { searchParams } = new URL(request.url);
  const after = searchParams.get('after');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  let q = db.collection('kofi_events')
    .orderBy('receivedAt', 'desc')
    .limit(limit);

  if (after) {
    const cursorDoc = await db.collection('kofi_events').doc(after).get();
    if (cursorDoc.exists) {
      q = q.startAfter(cursorDoc);
    }
  }

  const snapshot = await q.get();

  const events = snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      receivedAt: data.receivedAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  const lastId = snapshot.docs.length === limit
    ? snapshot.docs[snapshot.docs.length - 1].id
    : null;

  return NextResponse.json({ data: events, nextCursor: lastId });
}
