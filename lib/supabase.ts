
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const isMock = process.env.MOCK_AI === 'true' || process.env.NEXT_PUBLIC_SKIP_PAYMENT === 'true';

const mockSupabase = {
  from: (table: string) => ({
    select: () => ({
      or: () => ({
        data: [],
        error: null
      }),
      order: () => ({
        data: [],
        error: null
      }),
      single: () => ({
        data: table === 'games' ? { id: 'mock-id', title: 'Mock Game', s3_bundle_url: '/mock.html', creator_wallet: 'mock-wallet' } : null,
        error: null
      }),
      data: [],
      error: null
    }),
    insert: (data: any) => ({
      select: () => ({
        single: () => ({
          data: { ...data, id: 'mock-id-' + Date.now() },
          error: null
        })
      })
    }),
    update: () => ({
        match: () => ({
            data: {},
            error: null
        })
    })
  })
} as any;

export const supabase = isMock ? mockSupabase : createClient(supabaseUrl, supabaseAnonKey)
