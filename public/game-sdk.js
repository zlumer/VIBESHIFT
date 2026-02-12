// GameSDK for VIBESHIFT
// Exposes window.GameSDK for games to communicate with the parent app

window.GameSDK = {
  // Initialize connection
  init: function() {
    console.log('[GameSDK] Initializing...');
    window.parent.postMessage({ type: 'GAME_INIT' }, '*');
  },

  // Trigger payment request
  // amount: number (e.g., 0.1 SOL)
  payment_trigger: function(amount) {
    console.log(`[GameSDK] Triggering payment: ${amount} SOL`);
    window.parent.postMessage({ type: 'GAME_PAYMENT', amount: amount }, '*');
  },

  // Report game over and score
  // score: number
  game_over: function(score) {
    console.log(`[GameSDK] Game Over! Score: ${score}`);
    window.parent.postMessage({ type: 'GAME_OVER', score: score }, '*');
  }
};

// Auto-initialize if requested? Maybe wait for explicit call.
console.log('[GameSDK] Loaded. Access via window.GameSDK');
