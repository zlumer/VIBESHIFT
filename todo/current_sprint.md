# TODO: Fix and Finalize VIBESHIFT

## Completed (Sprint 1)
- [x] **Fix Playwright Tests:** Fixed Solana Public Key "Non-base58" error and stabilized mock wallet initialization.
- [x] **Full Integration Test:** Successfully ran all 4 Playwright scenarios (Feed, Payment SDK, Create, Remix).

## High Priority
- [ ] **Stabilize GIF/Preview Generation:** Headless browser in server actions is prone to X server errors. Consider a more robust or external preview service.
- [ ] **Session Key Integration:** Implement Gum Session Keys as per SPEC.md to replace simple mock signatures.
- [ ] **On-Chain Revenue Split:** Finalize the 45/20/20/15 smart contract logic.

## Technical Debt
- [ ] **Error Handling in Create:** Improve UI feedback when generation or publishing fails.
- [ ] **Asset Keyword Matching:** Improve keyword matching for assets (currently basic substring match).

## Mobile & UX
- [ ] **Mobile Responsive Audit:** Verify the 100vh Swiper works perfectly on various mobile screens.
- [ ] **Countdown Overlay:** Refine the "Game Starting in..." countdown UI.
