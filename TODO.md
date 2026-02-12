# ArcadeTok Bug/Todo List

## 1. UI/UX Bugs
- [ ] **Feed Focus Interaction:** The "Tap to Play" overlay is clickable, but the Swiper often intercepts the click as a drag. This makes it hard for users to start a game.
- [ ] **Exit Button Visibility:** The "EXIT" button appears in the top-left, but it can overlap with game UI or branding.
- [ ] **Loading States:** Feed shows "Loading Vibe Feed..." which is a bit generic. Transition from GIF to Iframe needs a smoother animation/blur.

## 2. Functionality & Integration
- [ ] **GameSDK Bi-directional Communication:** `GameSDK.payment_trigger` is called but the parent doesn't post back a success/failure message to the iframe. This means games can't react to payment status.
- [ ] **Session Keys Logic:** Currently, the PWA shows an `alert()` for payment. Need to implement actual Solana/Gum Session Key logic to bypass popups.
- [ ] **Supabase Asset Matching:** The current asset injection logic uses simple keyword matching. It could be improved by using vector search on asset tags.

## 3. Playwright Test Improvements
- [ ] **Assert Score Persistence:** Add a test case to ensure the `lastScore` is displayed in the UI after `GAME_OVER` is sent from the iframe.
- [ ] **Test Remix Query Params:** Verify that the remix prompt actually receives the `remixId` in the URL and fetches the correct code.
- [ ] **Mock Wallet in Tests:** The tests use a custom wallet fixture but don't fully simulate the Session Key signing flow.

## 4. Stability
- [ ] **Error Handling in Actions:** `generateGame` can fail if Gemini returns malformed markdown code. Need better regex/parsing for the generated HTML.
- [ ] **Preview Image Generation:** `generateGif` actually generates a PNG. Need true GIF generation or a better fallback strategy.
