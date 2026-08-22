import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type TablePosition = {
  tableId: string;
  row: number; // 0-indexed or 1-indexed grid row
  col: number; // 0-indexed or 1-indexed grid col
  section?: string; // e.g. "Indoor", "Terrace", "VIP", "Bar"
  shape?: 'rect' | 'round' | 'square';
};

export type FloorLayoutConfig = {
  gridRows: number;
  gridCols: number;
  positions: Record<string, { row: number; col: number; section?: string; shape?: string }>;
};

// GET: Fetch floor layout config for restaurant
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: { settings: true }
    });

    const settings = (restaurant?.settings as any) || {};
    const floorPlan: FloorLayoutConfig = settings.floorPlan || {
      gridRows: 6,
      gridCols: 6,
      positions: {}
    };

    return NextResponse.json({ success: true, data: floorPlan });
  } catch (error) {
    console.error('Failed to fetch floor plan:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Save floor layout config
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { floorPlan } = body;

    if (!floorPlan) {
      return NextResponse.json({ success: false, error: 'Missing floorPlan payload' }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: session.user.restaurantId },
      select: { settings: true }
    });

    const currentSettings = (restaurant?.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      floorPlan: {
        gridRows: floorPlan.gridRows || 6,
        gridCols: floorPlan.gridCols || 6,
        positions: floorPlan.positions || {}
      }
    };

    await prisma.restaurant.update({
      where: { id: session.user.restaurantId },
      data: { settings: updatedSettings }
    });

    return NextResponse.json({ success: true, data: updatedSettings.floorPlan });
  } catch (error) {
    console.error('Failed to save floor plan:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
