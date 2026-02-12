# VIBESHIFT Sprint Tasks

## 1. Playwright Test Stabilization
- [x] Scenario 1: Feed visibility check.
- [x] Scenario 2: GameSDK Payment bridge check.
- [x] Scenario 3: Create Flow - **Issue**: Wallet connection mocking is flaky in the UI. 
    - *Action:* Fixed via auto-connect in `lib/wallet.tsx` and improved Playwright injection.
- [ ] Scenario 4: Remix Flow - Needs new test script.

## 2. Wallet UX Improvements
- [x] Implement automatic wallet detection/auto-connect in `WalletProvider`.
- [ ] Add "Session Key" delegate UI (Gum SDK integration or mock).
- [ ] Improve wallet connect/disconnect state feedback (spinner/toast).

## 3. Vibecoding Engine
- [x] Basic AI generation with Gemini.
- [x] AI Validator with headless Playwright checks.
- [ ] Better Asset Keyword matching (semantic search?).
- [ ] True GIF generation (current version uses PNG screenshots as placeholders).

## 4. Feed UX
- [x] Vertical scroll with Swiper.js.
- [x] Auto-load games after 5s hover/idle.
- [ ] Countdown overlay refinements.
- [x] Pre-fetching next games in the feed.

## 5. Deployment / Building
- [/] Fix any linting/TS errors preventing `npm run build`. (Build verified compiling, TS check in progress).
- [ ] Verify Supabase RLS policies for `games` and `assets`.
