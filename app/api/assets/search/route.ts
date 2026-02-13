import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const tags = searchParams.get('tags')?.split(',');

    let dbQuery = supabase.from('assets').select('*');

    if (query) {
      dbQuery = dbQuery.ilike('tags', `%${query}%`);
    }

    if (tags && tags.length > 0) {
      dbQuery = dbQuery.contains('tags', tags);
    }

    const { data, error } = await dbQuery.limit(20);

    if (error) throw error;

    return NextResponse.json({ success: true, assets: data });
  } catch (error: any) {
    console.error('Asset search error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
