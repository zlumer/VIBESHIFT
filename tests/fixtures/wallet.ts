import { test as base, Page } from '@playwright/test';

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    // Inject mock wallet before every test
    await page.addInitScript(() => {
      // Create a mock Solana provider
      const mockSolana: any = {
        isPhantom: true,
        isConnected: false,
        publicKey: null,
        connect: async () => {
          console.log('[MockWallet] connect() called');
          mockSolana.isConnected = true;
          const pkStr = '2u3VfD9N2nQG6xS6V7p3uN3G6xS6V7p3uN3G6xS6V7p3';
          mockSolana.publicKey = { 
            toBase58: () => pkStr,
            toString: () => pkStr 
          };
          return Promise.resolve({ publicKey: mockSolana.publicKey });
        },
        disconnect: async () => {
          console.log('[MockWallet] disconnect() called');
          mockSolana.isConnected = false;
          mockSolana.publicKey = null;
          return Promise.resolve();
        },
        signTransaction: async (transaction: any) => {
          console.log('[MockWallet] signTransaction() called');
          return Promise.resolve(transaction);
        },
        signAllTransactions: async (transactions: any[]) => {
          console.log('[MockWallet] signAllTransactions() called');
          return Promise.resolve(transactions);
        },
        signMessage: async (message: any) => {
          console.log('[MockWallet] signMessage() called');
          return Promise.resolve({ signature: new Uint8Array([1, 2, 3]) });
        },
        on: (event: string, callback: any) => {
            console.log(`[MockWallet] on(${event}) called`);
        },
        request: async (args: any) => {
             console.log(`[MockWallet] request(${JSON.stringify(args)}) called`);
             return Promise.resolve({});
        }
      };

      // Inject into window
      (window as any).solana = mockSolana;
      console.log('[MockWallet] Injected window.solana');
    });

    await use(page);
  },
});
