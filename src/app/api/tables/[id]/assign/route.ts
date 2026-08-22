import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, QueueStatus, TableStatus, OrderStatus } from '@prisma/client';



// POST: Assign a queue entry to a table
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { queueId } = body;
    const { id: tableId } = await params;

    if (!queueId) {
      return NextResponse.json({ success: false, error: 'Missing queueId' }, { status: 400 });
    }

    // Transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check table is available
      const table = await tx.table.findUnique({ where: { id: tableId } });
      if (!table || table.status !== TableStatus.AVAILABLE) {
        throw new Error('Table is not available');
      }

      // 2. Check queue entry is WAITING or CALLED
      const queue = await tx.queueEntry.findUnique({ where: { id: queueId } });
      if (!queue || (queue.status !== QueueStatus.CALLED && queue.status !== QueueStatus.WAITING)) {
        throw new Error('Queue entry is not in WAITING or CALLED state');
      }

      // 3. Update Table Status
      await tx.table.update({
        where: { id: tableId },
        data: { status: TableStatus.OCCUPIED }
      });

      // 4. Update Queue Status
      await tx.queueEntry.update({
        where: { id: queueId },
        data: { status: QueueStatus.SEATED }
      });

      // 5. Create an empty Order for this table
      const order = await tx.order.create({
        data: {
          restaurantId: session.user.restaurantId,
          tableId: tableId,
          customerId: queue.customerId,
          queueId: queue.id,
          status: OrderStatus.PLACED,
          type: 'DINE_IN',
          subtotal: 0,
          tax: 0,
          total: 0,
        }
      });

      return order;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Failed to assign table:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
