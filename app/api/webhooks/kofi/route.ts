/**
 * Ko-fi Webhook Handler
 *
 * Ko-fi sends a form POST with a `data` field containing JSON when someone donates.
 * We verify the token, find the user by email, and grant them Pro access.
 *
 * Set up in Ko-fi: Account → API → Webhook URL → https://yourdomain.com/api/webhooks/kofi
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export const runtime = 'nodejs';

interface KofiPayload {
  verification_token: string;
  message_id: string;
  timestamp: string;
  type: 'Donation' | 'Subscription' | 'Shop Order' | 'Commission';
  from_name: string;
  message: string | null;
  amount: string;
  url: string;
  email: string;
  currency: string;
  is_subscription_payment: boolean;
  is_first_subscription_payment: boolean;
  kofi_transaction_id: string;
  tier_name: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Ko-fi sends application/x-www-form-urlencoded with a `data` field
    const formData = await request.formData();
    const raw = formData.get('data');

    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'Missing data field' }, { status: 400 });
    }

    let payload: KofiPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in data field' }, { status: 400 });
    }

    // Verify Ko-fi token
    const expectedToken = process.env.KOFI_VERIFICATION_TOKEN;
    if (!expectedToken || payload.verification_token !== expectedToken) {
      console.warn('Ko-fi webhook: invalid verification token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const donorEmail = payload.email?.toLowerCase();
    if (!donorEmail) {
      return NextResponse.json({ error: 'No email in payload' }, { status: 400 });
    }

    console.log(`Ko-fi webhook: ${payload.type} from ${payload.from_name} (${donorEmail}), amount: ${payload.amount} ${payload.currency}`);

    const db = getAdminFirestore();
    if (!db) {
      console.error('Ko-fi webhook: Admin Firestore not available');
      // Return 200 so Ko-fi doesn't retry — log the event manually
      return NextResponse.json({ ok: true, note: 'Admin SDK not configured' });
    }

    // Find the user by email in /users collection
    const usersSnapshot = await db.collection('users').where('email', '==', donorEmail).get();

    if (usersSnapshot.empty) {
      // Pro expires 30 days from now (clock starts from donation, not signup)
      const pendingExpiresAt = new Date();
      pendingExpiresAt.setDate(pendingExpiresAt.getDate() + 30);

      // User hasn't signed up yet — store the grant so it can be applied on first login
      await db.collection('kofi_grants').doc(donorEmail).set({
        email: donorEmail,
        from_name: payload.from_name,
        amount: payload.amount,
        currency: payload.currency,
        type: payload.type,
        kofi_transaction_id: payload.kofi_transaction_id,
        grantedAt: admin.firestore.FieldValue.serverTimestamp(),
        planExpiresAt: admin.firestore.Timestamp.fromDate(pendingExpiresAt),
        applied: false,
      });
      console.log(`Ko-fi webhook: no user found for ${donorEmail} — stored pending grant`);
      return NextResponse.json({ ok: true, status: 'pending_signup' });
    }

    // Pro expires 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const expiresAtTs = admin.firestore.Timestamp.fromDate(expiresAt);

    // Grant Pro to all matching users (should be exactly one)
    const batch = db.batch();
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const username = userData.username as string | undefined;

      // Update /users/{userId}
      batch.update(userDoc.ref, {
        plan: 'pro',
        planGrantedBy: 'kofi',
        planGrantedAt: admin.firestore.FieldValue.serverTimestamp(),
        planExpiresAt: expiresAtTs,
      });

      // Sync plan + expiry into /configs/{username} so the wallpaper API picks it up
      if (username) {
        const configRef = db.collection('configs').doc(username.toLowerCase());
        batch.update(configRef, { plan: 'pro', planExpiresAt: expiresAtTs });
      }
    }
    await batch.commit();

    // Mark any pending grant as applied
    const pendingGrant = await db.collection('kofi_grants').doc(donorEmail).get();
    if (pendingGrant.exists) {
      await pendingGrant.ref.update({ applied: true });
    }

    console.log(`Ko-fi webhook: Pro granted to ${donorEmail}`);
    return NextResponse.json({ ok: true, status: 'pro_granted' });

  } catch (error: any) {
    console.error('Ko-fi webhook error:', error);
    // Always return 200 to prevent Ko-fi from retrying on server errors
    return NextResponse.json({ ok: true, error: error.message }, { status: 200 });
  }
}
