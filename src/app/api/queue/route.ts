import { NextResponse } from 'next/server';
import { QueueService } from '@/services/queue.service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST: Join Queue (Public, no session required)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, phone, name, guests, preference, priority } = body;

    if (!restaurantId || !phone || !guests) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
    }

    const queueEntry = await QueueService.joinQueue({
      restaurantId,
      phone,
      name,
      guests: Number(guests),
      preference,
      priority
    });

    const positionData = await QueueService.getQueuePosition(restaurantId, queueEntry.id);

    return NextResponse.json({ 
      success: true, 
      data: { ...queueEntry, ...positionData } 
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Failed to join queue:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

// GET: Get Active Queue (Staff only)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const activeQueue = await QueueService.getActiveQueue(session.user.restaurantId);

    return NextResponse.json({ success: true, data: activeQueue }, { headers: corsHeaders });
  } catch (error) {
    console.error('Failed to fetch queue:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
