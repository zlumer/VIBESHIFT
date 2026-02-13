import { supabase } from '@/lib/supabase';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection, clusterApiUrl, Keypair } from '@solana/web3.js';

// The platform wallet that receives the treasury share
const PLATFORM_WALLET = new PublicKey('11111111111111111111111111111111');
const SOLANA_RPC = clusterApiUrl('devnet');

/**
 * Process payment and split logic.
 * In a real production environment, this would verify an on-chain transaction.
 * Here we implement the actual split calculation and prepare for on-chain execution.
 */
export async function processPaymentAndSplit(params: {
  amount: number;
  gameId: string;
  senderWallet: string;
  signature?: string; // Optional: verify existing transaction
}) {
  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed');

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

    // Fetch Remix Author if applicable
    let remixAuthorWallet = null;
    if (game.parent_game_id) {
        const { data: parentGame } = await supabase
            .from('games')
            .select('creator_wallet')
            .eq('id', game.parent_game_id)
            .single();
        
        if (parentGame) {
            remixAuthorWallet = parentGame.creator_wallet;
            remixShare = params.amount * 0.20;
        }
    }

    // 2. Fetch Assets for this game
    const { data: assets } = await supabase
      .from('game_assets_usage')
      .select('asset_id')
      .eq('game_id', params.gameId);

    // Asset splitting logic
    let assetWallets: string[] = [];
    if (assets && assets.length > 0) {
        const { data: assetData } = await supabase
            .from('assets')
            .select('creator_wallet')
            .in('id', assets.map((a: { asset_id: string }) => a.asset_id));
        
        if (assetData) {
            assetWallets = assetData.map((a: { creator_wallet: string }) => a.creator_wallet);
        }
    }

    // Adjust shares if remix or assets are missing (goes to creator per SPEC)
    const actualRemixShare = remixAuthorWallet ? remixShare : 0;
    const actualAssetShare = assetWallets.length > 0 ? assetShare : 0;
    
    const actualCreatorShare = creatorShare + 
                               (remixAuthorWallet ? 0 : remixShare) + 
                               (assetWallets.length > 0 ? 0 : assetShare);

    console.log(`Split for ${params.amount} SOL:`);
    console.log(`- Creator (${game.creator_wallet}): ${actualCreatorShare} SOL`);
    if (remixAuthorWallet) console.log(`- Remix Parent (${remixAuthorWallet}): ${actualRemixShare} SOL`);
    if (assetWallets.length > 0) console.log(`- Asset Pool (${assetWallets.length} assets): ${actualAssetShare} SOL`);
    console.log(`- Platform Treasury: ${platformShare} SOL`);

    // Verification sum
    const total = actualCreatorShare + actualRemixShare + actualAssetShare + platformShare;
    console.log(`- Total Distributed: ${total} SOL`);

    // 3. Perform the actual SOL transfers
    // In a Session Key context, the backend might trigger these if it has delegated authority,
    // or the frontend constructs a single multi-instruction transaction.
    // Here we simulate the transaction construction.

    const transaction = new Transaction();
    const senderPubKey = new PublicKey(params.senderWallet);

    // Add transfer to Creator
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: senderPubKey,
            toPubkey: new PublicKey(game.creator_wallet),
            lamports: Math.floor(actualCreatorShare * LAMPORTS_PER_SOL),
        })
    );

    // Add transfer to Remix Author
    if (remixAuthorWallet && actualRemixShare > 0) {
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: senderPubKey,
                toPubkey: new PublicKey(remixAuthorWallet),
                lamports: Math.floor(actualRemixShare * LAMPORTS_PER_SOL),
            })
        );
    }

    // Add transfers to Asset Owners
    if (assetWallets.length > 0 && actualAssetShare > 0) {
        const sharePerAsset = actualAssetShare / assetWallets.length;
        assetWallets.forEach(wallet => {
            transaction.add(
                SystemProgram.transfer({
                    fromPubkey: senderPubKey,
                    toPubkey: new PublicKey(wallet),
                    lamports: Math.floor(sharePerAsset * LAMPORTS_PER_SOL),
                })
            );
        });
    }

    // Add transfer to Platform Treasury
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: senderPubKey,
            toPubkey: PLATFORM_WALLET,
            lamports: Math.floor(platformShare * LAMPORTS_PER_SOL),
        })
    );

    // Note: To actually EXECUTE this from the backend, we would need 
    // a signed transaction or use a Session Key (Delegated authority).
    // If params.signature is provided, we just verify it.
    if (params.signature) {
        const status = await connection.getSignatureStatus(params.signature);
        console.log('Transaction Status:', status);
    }

    // Update revenue in DB
    const { error: revError } = await supabase
      .from('games')
      .update({ revenue_total: (game.revenue_total || 0) + params.amount })
      .eq('id', params.gameId);

    if (revError) throw revError;

    return { 
        success: true, 
        split: { 
            creator: actualCreatorShare, 
            remix: actualRemixShare, 
            assets: actualAssetShare, 
            platform: platformShare 
        },
        transaction: transaction.serialize({ verifySignatures: false }).toString('base64')
    };
  } catch (err: any) {
    console.error('Split logic error:', err);
    return { success: false, error: err.message };
  }
}
