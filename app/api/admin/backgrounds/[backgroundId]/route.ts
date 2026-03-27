import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/verify-admin';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ backgroundId: string }> }
) {
  const caller = await verifyAdminRequest(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { backgroundId } = await params;
  const body = await request.json() as { storagePath: string };

  if (!backgroundId || !body.storagePath) {
    return NextResponse.json({ error: 'backgroundId and storagePath are required' }, { status: 400 });
  }

  const db = getAdminFirestore();
  const storage = getAdminStorage();
  if (!db || !storage) {
    return NextResponse.json({ error: 'Database or storage unavailable' }, { status: 503 });
  }

  try {
    await storage.bucket().file(body.storagePath).delete({ ignoreNotFound: true });
    await db.collection('backgrounds').doc(backgroundId).delete();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
