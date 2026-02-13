# VIBESHIFT 👾

Vertical-scroll mobile PWA for playing, remixing, and monetizing AI-generated games with instant Solana session keys.

## Overview
VIBESHIFT is a TikTok-inspired feed for hypercasual gaming on Solana. We lower the barrier to entry for both players and creators by combining high-velocity social UX with AI-assisted "Vibecoding" and invisible blockchain transactions.

## Accessibility First
**Play Free, Connect to Pay.** Unlike many Web3 apps that gate everything behind a wallet connection, VIBESHIFT allows any user to browse the feed and play games immediately for free. We only request a wallet connection when the user decides to perform a paid action, such as an in-game microtransaction or creating/publishing a new remix.

## Technical Architecture
- **Frontend:** Next.js PWA optimized for mobile-first, vertical touch navigation using Swiper.js.
- **Game Engine:** [Kaplay.js](https://kaplayjs.com/) for lightweight, high-performance 2D gameplay.
- **Sandboxing:** Games run in strictly sandboxed iframes, communicating with the parent PWA via our `GameSDK` bridge (`window.postMessage`).
- **AI Creation:** Integrated pipeline using Anthropic's Claude 3.5 Sonnet to generate Kaplay.js logic, injected with pre-verified assets from our marketplace.
- **Monetization (Session Keys):** Leveraging Solana Session Keys (Gum/custom) to enable 1-click spends. No more transaction popups interrupting the game.

## Revenue Split (The 45/20/20/15 Rule)
On-chain revenue from in-game spends is automatically split:
- **45%** -> Current Game Creator
- **20%** -> Original Remix Author
- **20%** -> Asset Pool (Split among asset owners)
- **15%** -> VIBESHIFT Platform Treasury

## Getting Started
1. **Browse:** Open the app and start scrolling.
2. **Play:** Tap any game to enter focus mode.
3. **Remix:** Click the Remix button on any game to fork the code and change its "vibe" via AI.
4. **Connect:** Use the Wallet button only when you're ready to buy upgrades or publish your own creations.

---
Built for the Colosseum Agent Hackathon 2026.
