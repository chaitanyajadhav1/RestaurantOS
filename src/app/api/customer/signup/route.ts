import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { name, phone, password, restaurantSlug } = await request.json();

    if (!phone || !password || !restaurantSlug) {
      return NextResponse.json(
        { success: false, error: "Phone, password, and restaurant slug are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug }
    });

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: "Restaurant not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { phone, restaurantId: restaurant.id }
    });

    if (existingCustomer) {
      // If customer exists without password, update their password and name
      if (!existingCustomer.password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const updated = await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name: name || existingCustomer.name || "Guest",
            password: hashedPassword
          }
        });

        return NextResponse.json({
          success: true,
          data: {
            id: updated.id,
            name: updated.name,
            phone: updated.phone,
            restaurantId: restaurant.id,
            restaurantSlug: restaurant.slug
          },
          message: "Account updated successfully"
        }, { status: 200, headers: corsHeaders });
      }

      return NextResponse.json(
        { success: false, error: "An account with this phone number already exists. Please log in." },
        { status: 409, headers: corsHeaders }
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

    return NextResponse.json({
      success: true,
      data: {
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug
      },
      message: "Account created successfully"
    }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error("Customer Signup Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred during signup" },
      { status: 500, headers: corsHeaders }
    );
  }
}
