import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { QueueStatus, TableStatus, OrderStatus } from '@prisma/client';

// POST: Assign a queue entry (or walk-in group) to a table (Supports Shared Tables)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { queueId, guestsCount } = body;
    const { id: tableId } = await params;

    if (!queueId) {
      return NextResponse.json({ success: false, error: 'Missing queueId' }, { status: 400 });
    }

    // Transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch table with all currently active orders
      const table = await tx.table.findUnique({
        where: { id: tableId },
        include: {
          orders: {
            where: {
              status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
            },
          },
        },
      });

      if (!table) {
        throw new Error('Table not found');
      }

      if (table.status === TableStatus.CLEANING || table.status === TableStatus.OUT_OF_SERVICE) {
        throw new Error(`Table is currently ${table.status.toLowerCase()}`);
      }

      // 2. Check queue entry is WAITING or CALLED
      const queue = await tx.queueEntry.findUnique({
        where: { id: queueId },
        include: { customer: true },
      });

      if (!queue || (queue.status !== QueueStatus.CALLED && queue.status !== QueueStatus.WAITING)) {
        throw new Error('Queue entry is not in WAITING or CALLED state');
      }

      const partyGuests = guestsCount || queue.guests || 1;

      // 3. Compute current seat occupancy on this table
      const currentOccupiedSeats = table.orders.reduce(
        (sum, ord) => sum + (ord.guestCount || 1),
        0
      );
      const remainingSeats = table.capacity - currentOccupiedSeats;

      if (partyGuests > remainingSeats && currentOccupiedSeats > 0) {
        throw new Error(
          `Table ${table.number} only has ${remainingSeats} seat(s) available (Capacity: ${table.capacity}). Requested party has ${partyGuests} guests.`
        );
      }

      // 4. Determine next Party Label ('A', 'B', 'C', 'D'...)
      const usedPartyLabels = new Set(table.orders.map((o) => o.partyLabel || 'A'));
      const candidateLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const nextPartyLabel = candidateLabels.find((l) => !usedPartyLabels.has(l)) || 'A';

      const newTotalOccupied = currentOccupiedSeats + partyGuests;

      // 5. Update Table Status (OCCUPIED if full, PARTIALLY_OCCUPIED if seats remain)
      const nextTableStatus =
        newTotalOccupied >= table.capacity
          ? TableStatus.OCCUPIED
          : TableStatus.PARTIALLY_OCCUPIED;

      await tx.table.update({
        where: { id: tableId },
        data: { status: nextTableStatus },
      });

      // 6. Update Queue Status to SEATED
      await tx.queueEntry.update({
        where: { id: queueId },
        data: { status: QueueStatus.SEATED },
      });

      const partyName = queue.customer?.name
        ? `${queue.customer.name} (Party ${nextPartyLabel})`
        : `Party ${nextPartyLabel}`;

      // 7. Create independent Order tab for this party on the shared table
      const order = await tx.order.create({
        data: {
          restaurantId: session.user.restaurantId,
          tableId: tableId,
          customerId: queue.customerId,
          queueId: queue.id,
          partyLabel: nextPartyLabel,
          guestCount: partyGuests,
          groupName: partyName,
          status: OrderStatus.PLACED,
          type: 'DINE_IN',
          subtotal: 0,
          tax: 0,
          total: 0,
        },
        include: {
          table: true,
          customer: true,
          queueEntry: true,
        },
      });

      return order;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Failed to assign table:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
