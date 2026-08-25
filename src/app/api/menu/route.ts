import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';



export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: session.user.restaurantId },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: menuItems });
  } catch (error) {
    console.error('Failed to fetch menu items:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'WAITER', 'CASHIER'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price, type, categoryId, isAvailable, preparationTime, image } = body;

    if (!name || price === undefined || !type || !categoryId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        restaurantId: session.user.restaurantId,
        categoryId,
        name,
        description,
        price: parseFloat(price.toString()),
        type,
        isAvailable: isAvailable ?? true,
        preparationTime: preparationTime ? parseInt(preparationTime.toString()) : null,
        image,
      },
    });

    return NextResponse.json({ success: true, data: menuItem });
  } catch (error) {
    console.error('Failed to create menu item:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
