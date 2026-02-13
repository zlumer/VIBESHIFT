// GameSDK for VIBESHIFT
// Exposes window.GameSDK for games to communicate with the parent app

window.GameSDK = {
  // Callbacks for the game to implement
  onPaymentSuccess: null,
  onPaymentFailure: null,

  // Initialize connection
  init: function() {
    console.log('[GameSDK] Initializing...');
    window.parent.postMessage({ type: 'GAME_INIT' }, '*');
    
    // Setup listener for response messages
    window.addEventListener('message', (event) => {
      const { type, success, error } = event.data;
      if (type === 'PAYMENT_RESULT') {
        if (success) {
          console.log('[GameSDK] Payment success received from parent');
          if (typeof this.onPaymentSuccess === 'function') this.onPaymentSuccess();
        } else {
          console.error('[GameSDK] Payment failure received from parent:', error);
          if (typeof this.onPaymentFailure === 'function') this.onPaymentFailure(error);
        }
      }
    });
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
