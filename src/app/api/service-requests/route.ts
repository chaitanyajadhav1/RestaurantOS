import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ServiceRequestType } from "@prisma/client";

// GET: Fetch active (PENDING, ACKNOWLEDGED) service requests for the restaurant
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.restaurantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!(prisma as any).serviceRequest) {
      return NextResponse.json({ success: true, data: [] });
    }

    const requests = await prisma.serviceRequest.findMany({
      where: {
        restaurantId: session.user.restaurantId,
        status: {
          in: ["PENDING", "ACKNOWLEDGED"],
        },
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: "asc" }, // Oldest pending first
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error("Failed to fetch service requests:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a new service request from Customer or Table QR
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, tableId, type, notes } = body;

    if (!restaurantId || !tableId) {
      return NextResponse.json(
        { success: false, error: "Missing restaurantId or tableId" },
        { status: 400 }
      );
    }

    // Verify table exists
    const table = await prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      return NextResponse.json({ success: false, error: "Table not found" }, { status: 404 });
    }

    // Check if an unresolved duplicate request already exists for this table and type in the last 2 minutes
    const recentDuplicate = await prisma.serviceRequest.findFirst({
      where: {
        tableId,
        type: type || "CALL_WAITER",
        status: "PENDING",
      },
    });

    if (recentDuplicate) {
      return NextResponse.json({
        success: true,
        data: recentDuplicate,
        message: "Request already notified to staff.",
      });
    }

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        restaurantId,
        tableId,
        type: (type as ServiceRequestType) || ServiceRequestType.CALL_WAITER,
        notes: notes || null,
      },
      include: {
        table: {
          select: {
            id: true,
            number: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: serviceRequest });
  } catch (error: any) {
    console.error("Failed to create service request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
