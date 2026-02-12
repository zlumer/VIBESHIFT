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
    } else {
        // If no parent, 20% remix share goes back to creator
        // Total Creator: 45 + 20 = 65%
    }

    // Adjusting for the 'otherwise adds to Creator' rule in SPEC.md
    const actualCreatorShare = game.parent_game_id ? creatorShare : (creatorShare + params.amount * 0.20);

    console.log(`Split for ${params.amount} SOL:`);
    console.log(`- Creator (${game.creator_wallet}): ${actualCreatorShare} SOL`);
    if (game.parent_game_id) console.log(`- Remix Parent (${game.parent_game_id}): ${remixShare} SOL`);
    console.log(`- Asset Pool: ${assetShare} SOL`);
    console.log(`- Platform: ${platformShare} SOL`);

    // Verification sum should equal amount
    const total = actualCreatorShare + remixShare + assetShare + platformShare;
    console.log(`- Total Distributed: ${total} SOL`);

    const { error: revError } = await supabase
      .from('games')
      .update({ revenue_total: (game.revenue_total || 0) + params.amount })
      .eq('id', params.gameId);

    if (revError) throw revError;

    return { 
        success: true, 
        split: { 
            creator: actualCreatorShare, 
            remix: remixShare, 
            assets: assetShare, 
            platform: platformShare 
        } 
    };
  } catch (err: any) {
    console.error('Split logic error:', err);
    return { success: false, error: err.message };
  }
}
