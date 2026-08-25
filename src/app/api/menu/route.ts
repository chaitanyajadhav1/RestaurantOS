import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const slug = searchParams.get('slug');
    const restaurantId = searchParams.get('restaurantId');

    // 1. If slug or restaurantId is provided (public customer / mobile app request)
    if (slug || restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: slug ? { slug } : { id: restaurantId! },
        include: {
          menuCategories: {
            orderBy: { orderIndex: 'asc' },
            include: {
              items: {
                where: { isAvailable: true },
              },
            },
          },
        },
      });

      if (!restaurant) {
        return NextResponse.json({ success: false, error: 'Restaurant not found' }, { status: 404, headers: corsHeaders });
      }

      const currency = (restaurant.settings && typeof restaurant.settings === 'object' && 'currency' in restaurant.settings)
        ? (restaurant.settings as any).currency 
        : "₹";

      return NextResponse.json({
        success: true,
        data: {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
            address: restaurant.address,
            phone: restaurant.phone,
            currency,
          },
          categories: restaurant.menuCategories,
        },
      }, { headers: corsHeaders });
    }

    // 2. Staff / Admin authenticated request
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId: session.user.restaurantId },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ success: true, data: menuItems }, { headers: corsHeaders });
  } catch (error) {
    console.error('Failed to fetch menu items:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    if (!['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER', 'WAITER', 'CASHIER'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { name, description, price, type, categoryId, isAvailable, preparationTime, image } = body;

    if (!name || price === undefined || !type || !categoryId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
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

    return NextResponse.json({ success: true, data: menuItem }, { headers: corsHeaders });
  } catch (error) {
    console.error('Failed to create menu item:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
