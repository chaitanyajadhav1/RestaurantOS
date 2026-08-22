import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QueueService } from "@/services/queue.service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "CUSTOMER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { guests, preference } = await request.json();

    if (!guests || guests < 1) {
      return NextResponse.json({ error: "Invalid number of guests" }, { status: 400 });
    }

    const restaurantId = session.user.restaurantId;
    
    // We pass the phone and name from the session since QueueService needs it
    // Wait, QueueService expects to upsert the customer. We already have the customer ID in session,
    // but the existing QueueService.joinQueue relies on phone.
    
    const queueEntry = await QueueService.joinQueue({
      restaurantId,
      phone: session.user.email as string, // We used phone as email in auth.ts
      name: session.user.name as string,
      guests: Number(guests),
      preference: preference || "",
    });

    return NextResponse.json({ success: true, data: queueEntry }, { status: 201 });
  } catch (error: any) {
    console.error("Join Queue Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to join queue" },
      { status: 500 }
    );
  }
}
