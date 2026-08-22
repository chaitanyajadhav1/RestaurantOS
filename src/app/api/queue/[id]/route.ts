import { NextResponse } from 'next/server';
import { QueueService } from '@/services/queue.service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { QueueStatus } from '@prisma/client';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;
    const { id } = await params;

    if (!status || !Object.values(QueueStatus).includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const updatedQueue = await QueueService.updateStatus(id, status as QueueStatus);

    return NextResponse.json({ success: true, data: updatedQueue });
  } catch (error: any) {
    console.error('Failed to update queue status:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// GET: Check specific queue status (Public for customer tracking)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Need restaurantId from query params to calculate position accurately
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'Missing restaurantId' }, { status: 400 });
    }

    const positionData = await QueueService.getQueuePosition(restaurantId, id);
    return NextResponse.json({ success: true, data: positionData });
  } catch (error: any) {
    console.error('Failed to get queue status:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
