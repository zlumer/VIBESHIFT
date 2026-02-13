# VIBESHIFT Fix/Build Todo List

## Critical Fixes
- [x] **Next.js Metadata Errors:** Fixed `viewport` and `themeColor` warnings in `app/layout.tsx` to align with Next.js 15+ standards.
- [x] **Playwright Test Runner Conflict:** Tests are now configured to run from the `VIBESHIFT` directory with a dedicated `playwright.config.ts`.
- [x] **Session Key Integration:** Mock logic in `lib/wallet.tsx` is now robust enough for automated testing, bypassing wallet popups.
- [x] **Payment Split Logic:** `api/payment/split/route.ts` and `lib/revenue.ts` now implement the "45/20/20/15" split, including asset attribution.
- [ ] **GameSDK Loading:** Ensure `/game-sdk.js` is served correctly and initialized in all generated games.

## Building & Features
- [ ] **Asset Marketplace:** Implement the backend for asset search and attribution.
- [ ] **On-chain Payments:** Replace mock Solana transactions with real devnet/mainnet logic in `app/create/page.tsx`.
- [ ] **Mobile Optimization:** Test PWA features (manifest, service worker) on real mobile devices/emulators.

## Testing
- [x] **Fix `vibeshift.spec.ts`:** Updated with improved wait-for-load logic and mock wallet persistence.
- [ ] **Scenario 2 (GameSDK Payment):** Verify real-time balance updates and split distribution.
- [ ] **Scenario 4 (Remix Flow):** Ensure the `parent_game_id` is correctly passed and tracked for attribution.
