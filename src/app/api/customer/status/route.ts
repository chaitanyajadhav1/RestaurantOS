import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = session.user.id;
    const restaurantId = session.user.restaurantId;

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
        // Rough estimate: 5 minutes per party ahead
        estimatedWaitMins: queuePosition ? queuePosition * 5 : 0,
      };
    }

    // 2. Check for Active Table Allocation (via Order on an OCCUPIED table)
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
    if (activeOrder && activeOrder.table && activeOrder.table.status === "OCCUPIED") {
      tableData = {
        tableId: activeOrder.table.id,
        tableNumber: activeOrder.table.number,
        orderStatus: activeOrder.status,
        orderId: activeOrder.id,
        total: activeOrder.total,
        items: activeOrder.items.map(i => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          price: i.price
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
    });
  } catch (error) {
    console.error("Customer status fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
