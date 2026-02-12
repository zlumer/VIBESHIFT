# VIBESHIFT Phase 2: Session Keys (Research & Implementation Plan)

## Goal
Enable instant, seamless in-game payments without popup fatigue. Users should be able to "Vibe Check" (pay) or "Boost" during gameplay with one click, authorized by a temporary session key.

## Technical Strategy: Solana Actions + Chained Session Delegation

### 1. The Session Key Concept
- **Ephemeral Keypair**: Generate a temporary keypair in the browser's `localStorage` for each session.
- **Delegation Transaction**: The user signs one initial transaction (via standard wallet popup) that "delegates" a small amount of SOL (e.g., 0.5 SOL) or authority to a "Vibe Vault" contract, or simply authorizes the app to spend from a temporary session account.
- **In-Game Signing**: The GameSDK uses the ephemeral key to sign small "Micro-Blinks".

### 2. Implementation Steps

#### A. Session Key Generation (`lib/session.ts`)
```typescript
import { Keypair } from '@solana/web3.js';

export function getOrCreateSessionKey() {
  const existing = localStorage.getItem('vibeshift_session_key');
  if (existing) return Keypair.fromSecretKey(Buffer.from(existing, 'base64'));
  
  const newKey = Keypair.generate();
  localStorage.setItem('vibeshift_session_key', Buffer.from(newKey.secretKey).toString('base64'));
  return newKey;
}
```

#### B. The "Vibe Pass" Blink
- Create a Solana Action (Blink) that says "Enable One-Click Vibe Checks".
- This transaction sends 0.1 - 0.5 SOL to a "Session Account" controlled by the app + user's session key.

#### C. GameSDK Updates
- `window.GameSDK.request_session()`: Triggers the Blink for delegation.
- `window.GameSDK.fast_pay(amount)`: If session key is active, send signed transaction directly to RPC, bypassing the wallet popup.

#### D. Backend Logic (`app/api/payment/session-check`)
- Verify the signature from the session key.
- Ensure the amount is within the "delegated" limit.

## Next Steps
1. [ ] Create `lib/session.ts` and integrate with `WalletButton.tsx`.
2. [ ] Add `SessionAccount` table to Supabase to track delegated balances.
3. [ ] Implement the `fast_pay` endpoint in `app/api/payment/route.ts`.
4. [ ] Update `game-sdk.js` to support the new `fast_pay` method.

*Note: For the hackathon, we can simulate the "delegation" by just having the user "pre-fund" a small app-wallet.*
