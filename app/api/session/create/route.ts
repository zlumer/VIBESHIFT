import { NextResponse } from 'next/server';
import { sessionKeyService } from '@/lib/session-keys';

export async function POST(req: Request) {
  try {
    const { userWallet, limitSol, durationHours } = await req.json();

    if (!userWallet) {
      return NextResponse.json({ success: false, error: 'Missing user wallet' }, { status: 400 });
    }

    const session = await sessionKeyService.createSession(
      userWallet,
      limitSol || 1,
      durationHours || 24
    );

    return NextResponse.json({ success: true, ...session });
  } catch (error: any) {
    console.error('Session creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
