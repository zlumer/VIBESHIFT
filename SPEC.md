# ArcadeTok Spec: VIBESHIFT

## 1. Executive Summary
A vertical-scroll mobile PWA where users play AI-generated hypercasual games (built with Kaplay.js) in a TikTok-style feed. Users spend and earn Solana (SOL) instantly using Session Keys. Creators generate games via text prompts ("Vibecoding"), remix existing games, and monetize via a transparent on-chain revenue split.

## 2. Core User Experience (UX)

### 2.1 The Feed (Viewer)
* **Layout:** Full-screen vertical video feed (100vh).
* **Accessibility:** The app is fully accessible without wallet connection. Users can browse the feed and play games for free. Wallet connection is only required for payments (spends/purchases) and creator features.
* **State 1 (Scroll):** User scrolls through 5-second GIFs of gameplay. Audio is **ON** (unless system muted).
* **State 2 (Auto-Load):** If scroll stops for >5s, the GIF crossfades into the actual HTML5 game iframe.
* *Constraint:* Input is **blocked** to prevent "Scroll Traps."
* *UI:* A countdown overlay "Game Starting in 3... 2... 1" allows the user to scroll away if uninterested.
* **State 3 (Active Play):** User **taps the screen** to "Focus."
* Feed scrolling is now **Locked**.
* Game receives full touch input.
* **Exit:** A floating "Back/Exit" button (Top-Left) destroys the game instance and unlocks the feed.

### 2.2 The Wallet & Economy
* **Onboarding:** Login via Phantom / Solflare (Mobile Deep Link).
* **Session Keys:** Upon login, user signs a **Session Key** valid for 24 hours (limit: 5 SOL).
* *Benefit:* All in-game spends (e.g., "Pay 0.1 SOL for extra life") are 1-click (instant, no wallet popup).
* **Spending (User -> Game):**
* User clicks "Buy" in-game.
* System checks Session Key balance.
* **Smart Contract Split (The "45/20/20/15" Rule):**
* **45%** $\rightarrow$ Current Game Creator.
* **20%** $\rightarrow$ Original Remix Author (if applicable; otherwise adds to Creator).
* **20%** $\rightarrow$ Asset Pool (Split equally among asset owners used).
* **15%** $\rightarrow$ Platform Treasury.
* **Earning (Game -> User):**
* Game Logic triggers a payout (e.g., High Score).
* Developer's Treasury Wallet signs a transaction sending SOL to User (95% to User, 5% Platform Fee).
* **UI:** User sees a "Toast Notification" (e.g., "You won 0.5 SOL!").

### 2.3 Creation ("Vibecoding")
* **Interface:** Chat-based UI.
* **Input:** Text ("Make a flappy bird clone where I dodge Elon Musk heads") or Voice.
* **Process:**
1. LLM generates Kaplay.js code.
2. System searches Asset Marketplace for keywords ("Musk", "Bird").
3. Code + Assets injected into a preview iframe.
* **Action:**
* **Refine:** "Make the heads move faster."
* **Remix:** "Take this game but change the heads to Dogecoins."
* **Publishing:**
* User pays **$1 (in SOL)** to mint the game.
* Game is deployed to S3 + Database.

## 3. Technical Architecture

### 3.1 Tech Stack
* **Frontend:** React (Next.js) + Tailwind CSS (PWA optimized).
* **Game Engine:** [Kaplay.js](https://kaplayjs.com/) (Lightweight, TypeScript friendly).
* **Backend:** Node.js (Hono or Express) + Supabase (PostgreSQL).
* **AI:** Anthropic Claude 3.5 Sonnet (Best for code generation) via API.
* **Storage:** AWS S3 (Game HTML/JS bundles, Assets, GIFs).
* **Blockchain:** Solana (Mainnet).
* **Wallet SDK:** Solana Wallet Adapter + **Gum Session Keys** (or custom Session Key program).

### 3.2 Database Schema (Supabase)
We need a relational DB to handle the complex "Remix Tree" and "Asset Dependencies" for the revenue split.

```sql
users
- id (UUID)
- wallet_address (Primary Key)
- username (e.g. "player.sol")
- created_at

assets
- id (UUID)
- creator_wallet (FK -> users)
- s3_url
- tags (Array: ["bird", "enemy", "pixel"])

games
- id (UUID)
- creator_wallet (FK -> users)
- parent_game_id (FK -> games, nullable) -- Tracks Remix Origin
- title
- description
- s3_bundle_url (The HTML/JS zip)
- gif_preview_url
- status (draft, published)
- play_count
- revenue_total

game_assets_usage
- game_id (FK)
- asset_id (FK) -- This table links a game to the 5-10 assets it uses for the 20% split
```

### 3.3 The "Vibecoding" System Prompt
To ensure the AI generates playable Kaplay.js code that fits our SDK.

> **Role:** You are an expert Game Developer using Kaplay.js.
> **Constraint:** Output a SINGLE HTML file containing the game logic.
> **SDK Requirement:** You MUST include `window.GameSDK` calls:
> 1. `GameSDK.init()` on load.
> 2. `GameSDK.payment_trigger(amount)` when the user needs to buy something.
> 3. `GameSDK.game_over(score)` when the user dies.
> **Assets:** Use the following image URLs provided in the context: [url1, url2...].
> **Control:** The game must support Touch Controls (Tap to jump/shoot).
> **Orientation:** Portrait Mode (Aspect Ratio 9:16).

## 4. Development Phases

### Phase 1: The "Feed" MVP (Weeks 1-3)
* **Goal:** Scrollable feed playing hardcoded Kaplay.js games.
* **Tasks:**
1. Setup Next.js PWA with vertical swiper (Swiper.js or custom touch logic).
2. Implement "5s GIF -> Iframe load" transition.
3. Build the `GameSDK` bridge (`window.parent.postMessage` communication).
4. Create 3 demo games manually.

### Phase 2: Wallet & Session Keys (Weeks 4-5)
* **Goal:** Connect Wallet and spend fake SOL (Devnet).
* **Tasks:**
1. Integrate Solana Wallet Adapter.
2. Implement Session Key logic (User signs "Delegate" transaction).
3. Build the Backend Payment Listener (verifies transactions on-chain).

### Phase 3: Vibecoding Engine (Weeks 6-8)
* **Goal:** AI generation pipeline.
* **Tasks:**
1. Build the Chat UI.
2. Connect to Claude 3.5 API.
3. Implement Asset Injection (Simple keyword match from a static asset list first).
4. Implement "Publish" flow ($1 fee -> Upload to S3 -> Insert to DB).

### Phase 4: Remix & Revenue Split (Weeks 9-10)
* **Goal:** The Viral Loop.
* **Tasks:**
1. Implement "Remix" button (Passes `parent_game_id` code back to LLM context).
2. Build the Smart Contract / Backend Logic to handle the 4-way split (45/20/20/15).
3. Launch Mainnet.

## 5. Potential Pitfalls & Solutions

| Risk | Solution |
| :--- | :--- |
| **Asset Hallucination** | AI tries to use images that don't exist. **Fix:** We strictly inject a JSON list of available Asset URLs into the System Prompt and tell AI "Only use variables from this list." |
| **Broken Code** | AI generates syntax errors. **Fix:** A hidden "Validator" step where the server tries to compile/run the code headless. If it fails, auto-ask AI to fix it before showing the user. |
| **Scroll Trap** | Users get stuck in games. **Fix:** The "Exit Button" must be overlayed *outside* the iframe (in the parent PWA UI) so the game cannot hide it. |
| **Latency** | Loading games takes too long. **Fix:** Aggressive pre-fetching. When User is on Game #1, Game #2 and #3 are loading in background hidden iframes. |
