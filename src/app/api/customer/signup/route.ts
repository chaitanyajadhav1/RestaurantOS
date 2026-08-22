import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { name, phone, password, restaurantSlug } = await request.json();

    if (!phone || !password || !restaurantSlug) {
      return NextResponse.json(
        { message: "Phone, password, and restaurant slug are required" },
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug }
    });

    if (!restaurant) {
      return NextResponse.json({ message: "Restaurant not found" }, { status: 404 });
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { phone, restaurantId: restaurant.id }
    });

    if (existingCustomer) {
      return NextResponse.json(
        { message: "A customer with this phone number already exists for this restaurant" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newCustomer = await prisma.customer.create({
      data: {
        name: name || "Guest",
        phone,
        password: hashedPassword,
        restaurantId: restaurant.id,
      }
    });

    return NextResponse.json(
      { message: "Account created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Customer Signup Error:", error);
    return NextResponse.json(
      { message: error.message || "An error occurred during signup" },
      { status: 500 }
    );
  }
}
