import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER", "WAITER", "CASHIER"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verify existing item belongs to this restaurant
    const existing = await prisma.menuItem.findFirst({
      where: {
        id,
        restaurantId: session.user.restaurantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Menu item not found" }, { status: 404 });
    }

    const { name, description, price, type, categoryId, isAvailable, preparationTime, image } = body;

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(price !== undefined && { price: parseFloat(price.toString()) }),
        ...(type !== undefined && { type }),
        ...(categoryId !== undefined && { categoryId }),
        ...(isAvailable !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(preparationTime !== undefined && {
          preparationTime: preparationTime ? parseInt(preparationTime.toString()) : null,
        }),
        ...(image !== undefined && { image: image?.trim() || null }),
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedItem });
  } catch (error: any) {
    console.error("Failed to update menu item:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update menu item" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(req, { params });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.menuItem.findFirst({
      where: {
        id,
        restaurantId: session.user.restaurantId,
      },
      include: {
        orderItems: {
          take: 1,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Menu item not found" }, { status: 404 });
    }

    // Check if the item is part of existing orders
    if (existing.orderItems && existing.orderItems.length > 0) {
      // Instead of failing with a foreign key constraint violation, mark as unavailable or archive
      await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: false },
      });
      return NextResponse.json({
        success: true,
        archived: true,
        message: "Item is referenced in past orders, so it was marked as Unavailable instead of permanently deleted.",
      });
    }

    await prisma.menuItem.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Item deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete menu item:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete menu item" },
      { status: 500 }
    );
  }
}
