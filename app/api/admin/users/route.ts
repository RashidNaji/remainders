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

  const snapshot = await db.collection('users').get();
  const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  // Firestore Timestamps are not JSON-serialisable — convert them
  const serialised = users.map(u => serialiseTimestamps(u));
  return NextResponse.json({ data: serialised });
}

/** Recursively convert Firestore Timestamp fields to ISO strings. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialiseTimestamps(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
    return new Date(obj.seconds * 1000).toISOString();
  }
  if (Array.isArray(obj)) return obj.map(serialiseTimestamps);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, serialiseTimestamps(v)])
  );
}
