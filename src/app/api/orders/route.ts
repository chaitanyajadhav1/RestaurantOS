import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OrderService } from '@/services/order.service';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET: Fetch all active orders for the restaurant (Staff + Admin)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
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

    return NextResponse.json({ success: true, data: orders }, { headers: corsHeaders });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

// POST: Place a new order or add items
export async function POST(req: Request) {
  try {
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
      customerPhone,
      customerName,
      type, 
      items 
    } = body;

    const resolvedRestaurantId = session?.user?.restaurantId || restaurantId;

    if (!resolvedRestaurantId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing required fields or items' }, { status: 400, headers: corsHeaders });
    }

    let targetTableId = tableId;
    let targetQueueId = queueId;
    let customerId = session?.user?.role === 'CUSTOMER' ? session.user.id : undefined;

    // If mobile customer with phone
    if (!customerId && customerPhone) {
      let customer = await prisma.customer.findFirst({
        where: { restaurantId: resolvedRestaurantId, phone: customerPhone }
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            restaurantId: resolvedRestaurantId,
            phone: customerPhone,
            name: customerName || 'Guest'
          }
        });
      }
      customerId = customer.id;
    }

    // If customer is identified, auto-detect their active table if tableId was not passed
    if (customerId && !targetTableId) {
      const activeTableOrder = await prisma.order.findFirst({
        where: {
          customerId,
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

    return NextResponse.json({ success: true, data: order }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Failed to place order:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
