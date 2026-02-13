# TODO: Fix and Test Vibeshift

## Current State
- Feed & Play scenario passed.
- GameSDK Payment scenario passed.
- Create Flow and Remix Flow failed due to server-side Supabase errors.
- The `publishGame` server action tries to hit a real Supabase endpoint (localhost:54321) which is not running, causing `fetch failed`.
- Next.js Server Actions don't see the Playwright route mocks.

## Fix Strategy
1. **Mock Supabase on Server**: Use a conditional or environment variable in `lib/supabase.ts` to swap the client for a mock when testing.
2. **Handle Remix UI**: Ensure the "Remix It" button correctly triggers the action and handles the response.
3. **Redirection**: Verify the router push happens after a successful (mocked) publish.

## Tasks
- [x] Implement a Mock Supabase client for use in `MOCK_AI` or `TEST` mode.
- [x] Update `app/create/actions.ts` to handle mock publishing without hitting real network. (Handled via lib/supabase.ts mock)
- [x] Rerun Playwright tests to confirm 4/4 passing.
- [x] Commit all changes including the updated tests.

## Subagent Task
Build, fix, and test the app until it perfectly matches SPEC.md. Focus on the end-to-side flow: creation, remixing, and vertical feed navigation.
