import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/verify-admin';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import admin from 'firebase-admin';
import { randomUUID } from 'crypto';

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

  const snapshot = await db.collection('backgrounds').get();
  const backgrounds = snapshot.docs.map(d => ({ id: d.id, ...serialiseTimestamps(d.data()) }));
  return NextResponse.json({ data: backgrounds });
}

export async function POST(request: NextRequest) {
  const caller = await verifyAdminRequest(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminFirestore();
  const storage = getAdminStorage();
  if (!db || !storage) {
    return NextResponse.json({ error: 'Database or storage unavailable' }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const name = (formData.get('name') as string)?.trim();
  const isFree = formData.get('isFree') === 'true';
  const category = (formData.get('category') as string)?.trim() || 'general';

  if (!file || !name) {
    return NextResponse.json({ error: 'file and name are required' }, { status: 400 });
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, or WebP.' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size must be under 5MB.' }, { status: 400 });
  }

  try {
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const backgroundId = `preset_${Date.now()}`;
    const path = `backgrounds/presets/${backgroundId}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = storage.bucket();
    const fileRef = bucket.file(path);

    // Embed a Firebase download token in the object metadata so the resulting URL
    // matches what the client SDK's getDownloadURL() produces — works without
    // requiring the bucket to have public IAM access.
    const downloadToken = randomUUID();
    await fileRef.save(buffer, {
      contentType: file.type,
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    });

    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(path);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    await db.collection('backgrounds').doc(backgroundId).set({
      name,
      url,
      thumbnailUrl: url,
      isFree,
      category,
      storagePath: path,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: backgroundId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
