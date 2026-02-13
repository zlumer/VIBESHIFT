import { NextResponse } from 'next/server';
import { sessionKeyService } from '@/lib/session-keys';

export async function POST(req: Request) {
  try {
    const { sessionPublicKey, amountSol } = await req.json();

    if (!sessionPublicKey || amountSol === undefined) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const validation = await sessionKeyService.validateSpend(sessionPublicKey, amountSol);

    return NextResponse.json(validation);
  } catch (error: any) {
    console.error('Session validation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
