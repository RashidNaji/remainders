# Ko-fi Webhook Integration

Automatically grants Pro access to users when they donate on Ko-fi.

---

## How It Works

```
Ko-fi donation
     ↓
POST /api/webhooks/kofi
     ↓
Verify token → Find user by email → Grant Pro
     ↓
Updates /users/{userId}  +  /configs/{username}
     ↓
User's dashboard updates in real-time (no refresh needed)
```

### Two donation scenarios

| Scenario | What happens |
|---|---|
| Donor email matches their account email | Pro granted instantly |
| Donor used a different email | Pending grant stored; user verifies manually from dashboard |

### Pending grants (mismatched email)
If a donor's Ko-fi email doesn't match their account, a record is saved in `/kofi_grants/{email}` in Firestore. The user can go to their dashboard → scroll to **"Donated on Ko-fi?"** → enter the email they used → click **Verify** to claim Pro.

---

## Setup

### 1. Environment variables

Add these to your `.env` (and your deployment platform's env settings):

```
KOFI_VERIFICATION_TOKEN=your-token-from-kofi
FIREBASE_ADMIN_CREDENTIALS={"type":"service_account",...}   # full JSON on one line
```

**Getting your Ko-fi token:**
1. Ko-fi → Account Settings → API
2. Copy the **Verification Token**

**Getting the Firebase Admin credentials:**
1. Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key** → downloads a JSON file
3. Paste the entire JSON content as a single line into `FIREBASE_ADMIN_CREDENTIALS`

### 2. Ko-fi webhook URL

In Ko-fi → Account Settings → API → **Webhook URL**:
```
https://yourdomain.com/api/webhooks/kofi
```

### 3. Firestore rules

Make sure your Firestore rules include:
```
match /kofi_grants/{email} {
  allow read: if request.auth != null;
  allow write: if true;
}
```

---

## Testing Locally

### Step 1 — Start dev server
```bash
npm run dev
```

### Step 2 — Expose localhost (so Ko-fi can reach it)
```bash
brew install ngrok      # if not installed
ngrok http 3000
# → gives you https://abc123.ngrok-free.app
```

Use `https://abc123.ngrok-free.app/api/webhooks/kofi` as your Ko-fi webhook URL for testing.

### Step 3 — Send a fake donation

Replace the email with the account you want to test:

```bash
curl -X POST http://localhost:3000/api/webhooks/kofi \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode 'data={
    "verification_token":"819c0639-ecab-4f89-ac96-bbacafa236d7",
    "type":"Donation",
    "from_name":"Test User",
    "email":"user@example.com",
    "amount":"3.00",
    "currency":"USD",
    "kofi_transaction_id":"test-001",
    "message":null,
    "is_subscription_payment":false,
    "is_first_subscription_payment":false,
    "url":"",
    "timestamp":"2026-03-24T00:00:00Z",
    "message_id":"test-001",
    "tier_name":null
  }'
```

**Expected response:**
```json
{ "ok": true, "status": "pro_granted" }
```

If the email has no account yet:
```json
{ "ok": true, "status": "pending_signup" }
```

### Step 4 — Verify in Firestore

Check these two documents were updated:
- `/users/{userId}` → `plan: "pro"`, `planGrantedBy: "kofi"`
- `/configs/{username}` → `plan: "pro"`

The user's dashboard updates in real-time — no refresh needed.

---

## Troubleshooting

| Response | Cause | Fix |
|---|---|---|
| `{"error":"Unauthorized"}` | Wrong verification token | Check `KOFI_VERIFICATION_TOKEN` in `.env` |
| `{"error":"Invalid JSON in data field"}` | Line break in the curl command | Make sure the `data` value is on one line |
| `{"ok":true,"note":"Admin SDK not configured"}` | Missing `FIREBASE_ADMIN_CREDENTIALS` | Add the service account JSON to `.env` |
| `{"ok":true,"status":"pending_signup"}` | No account found for that email | User needs to sign up, or use the dashboard "Donated on Ko-fi?" field |

---

## Files

| File | Purpose |
|---|---|
| `app/api/webhooks/kofi/route.ts` | Webhook handler |
| `lib/firebase-admin.ts` | Firebase Admin SDK initialization |
| `lib/firebase.ts` → `applyPendingKofiGrant()` | Applies a pending grant when user verifies email |
| `app/dashboard/page.tsx` → "Donated on Ko-fi?" section | UI for users with mismatched emails |

---

## Security Notes

- The verification token prevents fake webhooks — never expose it publicly
- The Firebase Admin service account JSON is a private key — never commit it to git (`.gitignore` already blocks `*firebase-adminsdk*.json`)
- If either credential is leaked, regenerate it immediately from Ko-fi / Firebase Console
