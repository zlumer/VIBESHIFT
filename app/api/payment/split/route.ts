import { NextResponse } from 'next/server';
import { processPaymentAndSplit } from '@/lib/revenue';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, gameId, senderWallet } = body;

    if (!amount || !gameId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const result = await processPaymentAndSplit({
      amount: Number(amount),
      gameId,
      senderWallet: senderWallet || 'anonymous'
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Payment API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
