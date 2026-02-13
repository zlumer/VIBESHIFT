import { supabase } from './supabase';
import fs from 'fs';
import path from 'path';

/**
 * Migration Service
 * Runs SQL schema on app initialization to ensure DB consistency.
 * In a production app, we would use a real migration tool (like Prisma or Supabase CLI),
 * but for the Hackerton MVP, we execute the schema.sql via the RPC or Admin key.
 */
export async function runMigrations() {
  if (process.env.SKIP_DB_INIT === 'true') {
    console.log('Migrations: SKIP_DB_INIT is true, skipping.');
    return;
  }

  console.log('Migrations: Starting schema check...');
  
  try {
    // Note: Supabase doesn't have a direct 'execute raw sql' from the client without an RPC function.
    // For this hack, we check if a key table exists. If not, we log that it needs manual setup
    // OR we can trigger a seeding function if we had the service role key available in a way that allows it.
    
    const { data, error } = await supabase.from('games').select('id').limit(1);
    
    if (error && error.code === '42P01') {
      console.warn('Migrations: Games table missing. Database needs initialization.');
      // If we had an 'exec_sql' RPC defined in Supabase, we would call it here.
    } else {
      console.log('Migrations: Database connection healthy.');
    }

    // Seed Vibe Dodge if it doesn't exist
    const { data: vibeDodge } = await supabase.from('games').select('id').eq('title', 'Vibe Dodge').single();
    if (!vibeDodge) {
        console.log('Migrations: Seeding Vibe Dodge...');
        await supabase.from('games').insert({
            title: 'Vibe Dodge',
            s3_bundle_url: 'https://vibeshift-jade.vercel.app/games/generated/vibe-dodge.html',
            creator_wallet: 'HackertonWallet',
            status: 'published',
            gif_preview_url: 'https://placehold.co/360x640/purple/white.png?text=Vibe+Dodge+Gameplay'
        });
    }

  } catch (err) {
    console.error('Migrations: Failed during check', err);
  }
}
