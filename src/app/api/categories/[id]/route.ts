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

    if (!["SUPER_ADMIN", "RESTAURANT_ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.menuCategory.findFirst({
      where: {
        id,
        restaurantId: session.user.restaurantId,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    const { name, orderIndex } = body;

    const updated = await prisma.menuCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(orderIndex !== undefined && { orderIndex: parseInt(orderIndex.toString()) || 0 }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update category" },
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

    const existing = await prisma.menuCategory.findFirst({
      where: {
        id,
        restaurantId: session.user.restaurantId,
      },
      include: {
        items: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    }

    if (existing.items && existing.items.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete category "${existing.name}" because it contains ${existing.items.length} menu item(s). Please move or delete those items first.`,
        },
        { status: 400 }
      );
    }

    await prisma.menuCategory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete category" },
      { status: 500 }
    );
  }
}
