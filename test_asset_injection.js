const { generateGame } = require('./app/create/actions');
require('dotenv').config({ path: '.env.local' });

async function test() {
  console.log('Testing generateGame with asset injection...');
  
  // Test prompt that should trigger asset search
  const prompt = "A flappy bird clone with elon musk heads and rockets";
  
  const result = await generateGame(prompt);
  
  if (result.success) {
    console.log('SUCCESS: Game generated');
    console.log('Game URL:', result.url);
    console.log('Assets found:', result.assetsUsed?.length || 0);
    if (result.assetsUsed && result.assetsUsed.length > 0) {
      console.log('Assets:', result.assetsUsed.map(a => a.s3_url).join(', '));
    }
    
    // Check if assets were mentioned in the code (if not mock)
    if (process.env.MOCK_AI !== 'true') {
        const containsAsset = result.assetsUsed.some(a => result.code.includes(a.s3_url));
        console.log('Asset URLs present in code:', containsAsset);
    } else {
        console.log('Mock AI enabled, code contains mock output.');
    }
  } else {
    console.error('FAILURE:', result.error);
  }
}

test();
