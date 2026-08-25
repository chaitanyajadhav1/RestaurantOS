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
    const { phone, password, restaurantSlug } = await request.json();

    if (!phone || !password || !restaurantSlug) {
      return NextResponse.json(
        { success: false, error: "Phone, password, and restaurant code are required" },
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

    const customer = await prisma.customer.findFirst({
      where: { phone, restaurantId: restaurant.id }
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "No account found with this phone number. Please sign up." },
        { status: 404, headers: corsHeaders }
      );
    }

    if (!customer.password) {
      return NextResponse.json(
        { success: false, error: "Please set a password by signing up again." },
        { status: 400, headers: corsHeaders }
      );
    }

    const isValid = await bcrypt.compare(password, customer.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name || "Guest",
        phone: customer.phone,
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
      }
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Customer Login Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred during login" },
      { status: 500, headers: corsHeaders }
    );
  }
}
