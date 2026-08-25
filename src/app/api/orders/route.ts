import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { OrderService } from '@/services/order.service';



// GET: Fetch all active orders for the restaurant (Staff + Admin)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { 
        restaurantId: session.user.restaurantId,
        status: {
          notIn: ['COMPLETED', 'CANCELLED'] // Active orders
        }
      },
      include: {
        table: true,
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Place a new order or add items
export async function POST(req: Request) {
  try {
    // Both Customers (no session) and Waiters (session) can place orders.
    // Waiters will use the session's restaurantId, Customers will pass it in the body.
    const session = await getServerSession(authOptions);
    
    const body = await req.json();
    const { 
      restaurantId, 
      orderId, 
      tableId, 
      queueId, 
      partyLabel, 
      guestCount, 
      groupName, 
      type, 
      items 
    } = body;

    const resolvedRestaurantId = session?.user?.restaurantId || restaurantId;

    if (!resolvedRestaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing required fields or items' }, { status: 400 });
    }

    let targetTableId = tableId;
    let targetQueueId = queueId;
    let customerId = session?.user?.role === 'CUSTOMER' ? session.user.id : undefined;

    // If customer is logged in, auto-detect their seated table if not provided
    if (session?.user?.role === 'CUSTOMER') {
      const activeTableOrder = await prisma.order.findFirst({
        where: {
          customerId: session.user.id,
          restaurantId: resolvedRestaurantId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          tableId: { not: null }
        },
        include: { table: true },
        orderBy: { createdAt: 'desc' }
      });

      if (activeTableOrder && activeTableOrder.table && ['OCCUPIED', 'PARTIALLY_OCCUPIED'].includes(activeTableOrder.table.status)) {
        targetTableId = activeTableOrder.tableId;
        targetQueueId = activeTableOrder.queueId || undefined;
      }
    }

    const order = await OrderService.placeOrder({
      restaurantId: resolvedRestaurantId,
      orderId,
      customerId,
      tableId: targetTableId,
      queueId: targetQueueId,
      partyLabel,
      guestCount,
      groupName,
      type: type || 'DINE_IN',
      items
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error('Failed to place order:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
