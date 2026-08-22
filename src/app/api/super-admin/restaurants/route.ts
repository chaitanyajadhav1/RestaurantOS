import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/super-admin/restaurants — list all hotels
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, tables: true, orders: true } },
    },
  });

  return NextResponse.json({ restaurants });
}

// POST /api/super-admin/restaurants — create a new hotel
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { name, address, phone } = await req.json();

  if (!name) {
    return NextResponse.json({ message: "Hotel name is required" }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);

  const restaurant = await prisma.restaurant.create({
    data: {
      name,
      slug,
      address: address || null,
      phone: phone || null,
      settings: { currency: "₹", tax: 5, paymentMethods: ["CASH", "UPI", "CARD"] },
    },
  });

  return NextResponse.json({ restaurant }, { status: 201 });
}
