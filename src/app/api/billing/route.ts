import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BillingService } from '@/services/billing.service';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, amount, method } = body;

    if (!orderId || !amount || !method) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const result = await BillingService.settleOrder({
      restaurantId: session.user.restaurantId,
      orderId,
      amount: parseFloat(amount),
      method
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Failed to process billing:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
