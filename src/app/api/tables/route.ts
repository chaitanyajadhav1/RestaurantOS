import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';



// GET: Fetch all tables for the restaurant (Staff + Admin)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const tables = await prisma.table.findMany({
      where: { restaurantId: session.user.restaurantId },
      include: {
        orders: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
          },
          include: {
            customer: true,
            queueEntry: true,
            items: {
              include: { menuItem: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { number: 'asc' },
    });

    return NextResponse.json({ success: true, data: tables });
  } catch (error) {
    console.error('Failed to fetch tables:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new table (Admin / Manager only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.restaurantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'RESTAURANT_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { number, capacity, location } = body;

    if (!number || !capacity) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const table = await prisma.table.create({
      data: {
        restaurantId: session.user.restaurantId,
        number,
        capacity: parseInt(capacity),
        location,
        status: 'AVAILABLE',
      },
    });

    return NextResponse.json({ success: true, data: table });
  } catch (error) {
    console.error('Failed to create table:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
