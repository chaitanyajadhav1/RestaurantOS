import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, TableStatus } from '@prisma/client';



// PATCH: Update table status / number / capacity / location
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, number, capacity, location } = body;

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status as TableStatus;
    if (number) dataToUpdate.number = number;
    if (capacity) dataToUpdate.capacity = parseInt(capacity);
    if (location !== undefined) dataToUpdate.location = location;

    const updatedTable = await prisma.table.update({
      where: { 
        id,
        restaurantId: session.user.restaurantId // ensure table belongs to restaurant
      },
      data: dataToUpdate,
    });

    // If table was freed (AVAILABLE or CLEANING), close any active order and queue entries on that table
    if (status === 'AVAILABLE' || status === 'CLEANING') {
      const activeOrders = await prisma.order.findMany({
        where: {
          tableId: id,
          restaurantId: session.user.restaurantId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] }
        },
        select: { id: true, queueId: true }
      });

      if (activeOrders.length > 0) {
        await prisma.order.updateMany({
          where: {
            tableId: id,
            restaurantId: session.user.restaurantId,
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
          },
          data: { status: 'COMPLETED' }
        });

        const queueIds = activeOrders.map(o => o.queueId).filter(Boolean) as string[];
        if (queueIds.length > 0) {
          await prisma.queueEntry.updateMany({
            where: { id: { in: queueIds } },
            data: { status: 'COMPLETED' }
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: updatedTable });
  } catch (error) {
    console.error('Failed to update table:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove table (Admin / Manager only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.table.delete({
      where: { 
        id,
        restaurantId: session.user.restaurantId
      }
    });

    return NextResponse.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Failed to delete table:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
