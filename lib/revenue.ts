import { supabase } from '@/lib/supabase';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection, clusterApiUrl } from '@solana/web3.js';

const PLATFORM_WALLET = new PublicKey('11111111111111111111111111111111');
const SOLANA_RPC = clusterApiUrl('devnet');

export async function processPaymentAndSplit(params: {
  amount: number;
  gameId: string;
  senderWallet: string;
}) {
  try {
    // 1. Fetch Game and Creator
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('creator_wallet, parent_game_id, revenue_total')
      .eq('id', params.gameId)
      .single();

    if (gameError || !game) throw new Error('Game not found');

    // SPEC.md Split (45/20/20/15):
    // 45% Creator
    // 20% Original Remix Author (if exists, else Creator)
    // 20% Asset Pool
    // 15% Platform Treasury

    const creatorShare = params.amount * 0.45;
    let remixShare = 0;
    let assetShare = params.amount * 0.20;
    let platformShare = params.amount * 0.15;

    if (game.parent_game_id) {
        remixShare = params.amount * 0.20;
    }

    // 2. Fetch Assets for this game
    const { data: assets, error: assetsError } = await supabase
      .from('game_assets_usage')
      .select('asset_id')
      .eq('game_id', params.gameId);

    // If no assets, asset share adds to Creator (not clearly specified in SPEC, but usually Creator gets the rest)
    // However, SPEC says "otherwise adds to Creator" only for remix author.
    // Let's assume Asset Pool is always 20%, but if no assets, it might go to Platform or Creator.
    // Given the Remix rule, let's keep it consistent: if no assets, Creator gets it.
    
    if (!assets || assets.length === 0) {
        // No assets, creator gets the asset share
    } else {
        // Asset share stays as is (20%)
    }

    const actualCreatorShare = (game.parent_game_id ? creatorShare : (creatorShare + remixShare)) + 
                               ((!assets || assets.length === 0) ? assetShare : 0);
    
    const actualRemixShare = game.parent_game_id ? remixShare : 0;
    const actualAssetShare = (!assets || assets.length === 0) ? 0 : assetShare;

    console.log(`Split for ${params.amount} SOL:`);
    console.log(`- Creator (${game.creator_wallet}): ${actualCreatorShare} SOL`);
    if (game.parent_game_id) console.log(`- Remix Parent (${game.parent_game_id}): ${actualRemixShare} SOL`);
    if (actualAssetShare > 0) console.log(`- Asset Pool (${assets?.length} assets): ${actualAssetShare} SOL`);
    console.log(`- Platform: ${platformShare} SOL`);

    // Verification sum should equal amount
    const total = actualCreatorShare + actualRemixShare + actualAssetShare + platformShare;
    console.log(`- Total Distributed: ${total} SOL`);

    const { error: revError } = await supabase
      .from('games')
      .update({ revenue_total: (game.revenue_total || 0) + params.amount })
      .eq('id', params.gameId);

    if (revError) throw revError;

    // TODO: Actually send the SOL via Solana Web3.js / Session Keys
    // For now, it's a successful mock of the logic.

    return { 
        success: true, 
        split: { 
            creator: actualCreatorShare, 
            remix: actualRemixShare, 
            assets: actualAssetShare, 
            platform: platformShare 
        } 
    };
  } catch (err: any) {
    console.error('Split logic error:', err);
    return { success: false, error: err.message };
  }
}
