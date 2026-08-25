import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ServiceRequestStatus } from "@prisma/client";

// PATCH: Update service request status (ACKNOWLEDGED or RESOLVED)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.restaurantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !Object.values(ServiceRequestStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    // Ensure request belongs to user's restaurant
    const existing = await prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!existing || existing.restaurantId !== session.user.restaurantId) {
      return NextResponse.json(
        { success: false, error: "Service request not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.serviceRequest.update({
      where: { id },
      data: {
        status: status as ServiceRequestStatus,
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

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Failed to update service request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
