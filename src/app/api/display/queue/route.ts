import { NextResponse } from 'next/server';
import { QueueService } from '@/services/queue.service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'Missing restaurantId' }, { status: 400 });
    }

    const activeQueue = await QueueService.getActiveQueue(restaurantId);

    // Filter down data for public display to avoid leaking personal info
    const displayQueue = activeQueue.map(q => ({
      id: q.id,
      tokenNumber: q.tokenNumber,
      status: q.status,
      priority: q.priority
    }));

    return NextResponse.json({ success: true, data: displayQueue });
  } catch (error) {
    console.error('Failed to fetch display queue:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
