import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const paramRestaurantId = searchParams.get('restaurantId');
    const paramPhone = searchParams.get('phone');

    const session = await getServerSession(authOptions);

    let customerId: string | undefined = session?.user?.id;
    let restaurantId: string | undefined = session?.user?.restaurantId || paramRestaurantId || undefined;

    // If mobile app query via phone
    if ((!customerId || session?.user?.role !== 'CUSTOMER') && paramPhone && restaurantId) {
      const customer = await prisma.customer.findFirst({
        where: { restaurantId, phone: paramPhone }
      });
      if (customer) {
        customerId = customer.id;
      }
    }

    if (!customerId || !restaurantId) {
      return NextResponse.json({
        success: true,
        data: {
          state: "NONE",
          queue: null,
          table: null,
        },
      }, { headers: corsHeaders });
    }

    // 1. Check for Active Queue Entry
    const activeQueue = await prisma.queueEntry.findFirst({
      where: {
        customerId,
        restaurantId,
        status: { in: ["WAITING", "CALLED"] },
      },
    });

    let queuePosition = null;
    let queueData = null;

    if (activeQueue) {
      if (activeQueue.status === "WAITING") {
        // Calculate position in queue
        queuePosition = await prisma.queueEntry.count({
          where: {
            restaurantId,
            status: "WAITING",
            OR: [
              { priority: "PRIORITY", createdAt: { lt: activeQueue.createdAt } },
              {
                priority: activeQueue.priority,
                createdAt: { lt: activeQueue.createdAt },
              },
            ],
          },
        });
        queuePosition += 1; // 1-indexed
      }

      queueData = {
        id: activeQueue.id,
        tokenNumber: activeQueue.tokenNumber,
        status: activeQueue.status,
        guests: activeQueue.guests,
        position: queuePosition,
        estimatedWaitMins: queuePosition ? queuePosition * 5 : 0,
      };
    }

    // 2. Check for Active Table Allocation (via Order on an OCCUPIED or PARTIALLY_OCCUPIED table)
    const activeOrder = await prisma.order.findFirst({
      where: {
        customerId,
        restaurantId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        tableId: { not: null },
      },
      include: {
        table: true,
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    let tableData = null;
    if (activeOrder && activeOrder.table && (activeOrder.table.status === "OCCUPIED" || activeOrder.table.status === "PARTIALLY_OCCUPIED")) {
      tableData = {
        tableId: activeOrder.table.id,
        tableNumber: activeOrder.table.number,
        orderStatus: activeOrder.status,
        orderId: activeOrder.id,
        partyLabel: activeOrder.partyLabel,
        total: activeOrder.total,
        items: activeOrder.items.map(i => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          price: i.price,
          specialInstructions: i.specialInstructions
        })),
      };
    }

    // Determine the primary state
    let state = "NONE";
    if (tableData) {
      state = "SEATED";
    } else if (queueData && queueData.status === "CALLED") {
      state = "CALLED";
    } else if (queueData && queueData.status === "WAITING") {
      state = "WAITING";
    }

    return NextResponse.json({
      success: true,
      data: {
        state,
        queue: queueData,
        table: tableData,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Customer status fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
